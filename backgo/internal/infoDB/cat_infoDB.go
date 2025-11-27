package infoDB

import (
	"database/sql"
	"encoding/json"
	"time"
	"github.com/lib/pq"
)

// ===================== Cat Breed Models =====================

type Cat struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	Origin          string  `json:"origin"`
	Description     string  `json:"description"`
	Care            string  `json:"care"`
	ImageURL        string  `json:"image_url"`
	
	// Engagement metrics 
	LikeCount       int `json:"like_count"`
	DislikeCount    int `json:"dislike_count"`
	DiscussionCount int `json:"discussion_count"`
	ViewCount       int `json:"view_count"`
	
	// User's interaction (if logged in)
	UserReaction *string `json:"user_reaction,omitempty"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedBy *int      `json:"created_by,omitempty"`

	// (เพิ่ม) รองรับค่าเฉลี่ยดาวจาก Database
	AverageRatings map[string]float64 `json:"ratings"`
}

type CreateCatRequest struct {
	Name            string `json:"name" binding:"required,min=2,max=255"`
	Origin          string `json:"origin"`
	Description     string `json:"description"`
	Care            string `json:"care"`
	ImageURL        string `json:"image_url"`
}

type UpdateCatRequest struct {
	Name            string `json:"name" binding:"min=2,max=255"`
	Origin          string `json:"origin"`
	Description     string `json:"description"`
	Care            string `json:"care"`
	ImageURL        string `json:"image_url"`
}

// ===================== Discussion Models =====================

type Discussion struct {
	ID              int           `json:"id"`
	BreedID         int           `json:"breed_id"`
	// 🚩 เพิ่มฟิลด์ BreedName สำหรับหน้า Profile
	BreedName       string        `json:"breed_name"` 
	UserID          int           `json:"user_id"`
	Username        string        `json:"username"`
	Message         string        `json:"message"`
	ParentID        *int          `json:"parent_id,omitempty"`
	
	LikeCount       int           `json:"like_count"`
	DislikeCount    int           `json:"dislike_count"`
	ReplyCount      int           `json:"reply_count"`
	
	UserReaction    *string       `json:"user_reaction,omitempty"`
	IsDeleted       bool          `json:"is_deleted"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Replies         []Discussion  `json:"replies,omitempty"`

	// (เพิ่ม) รองรับดาวและแท็ก
	Ratings   map[string]int `json:"ratings"`
	Tags      []string       `json:"tags"`
}

type CreateDiscussionRequest struct {
	BreedID  int    `json:"breed_id" binding:"required"`
	ParentID *int   `json:"parent_id"`
	Message  string `json:"message" binding:"required,min=1,max=2000"`
	// (เพิ่ม) รับค่าดาวและแท็กจาก Frontend
	Ratings  map[string]int `json:"ratings"`
	Tags     []string       `json:"tags"`
}

type UpdateDiscussionRequest struct {
	Message string         `json:"message" binding:"required,min=1,max=2000"`
	Ratings map[string]int `json:"ratings"`
	Tags    []string       `json:"tags"`
}

// ===================== Reaction Models =====================

type ReactionResponse struct {
	UserReaction *string `json:"user_reaction"`
	LikeCount    int     `json:"like_count"`
	DislikeCount int     `json:"dislike_count"`
}

var db *sql.DB

func SetDB(d *sql.DB) {
	db = d
}

// Helper function: คำนวณค่าเฉลี่ยของ ratings ทั้งหมด และ Update ลงในตาราง cat_breeds
func CalculateAndSetAverageRatings(breedID int) error {
	var avgRatingsJSON []byte

	// 1. Calculate the average of all ratings for the given breed
	// ใช้ COALESCE(..., 0.0) เพื่อทำให้ AVG ที่เป็น NULL กลายเป็น 0.0 เสมอ
	err := db.QueryRow(`
		SELECT 
			jsonb_build_object(
				'friendliness', COALESCE(ROUND(AVG(NULLIF((d.ratings ->> 'friendliness')::numeric, 0)), 2), 0.0),
				'adaptability', COALESCE(ROUND(AVG(NULLIF((d.ratings ->> 'adaptability')::numeric, 0)), 2), 0.0),
				'energyLevel', COALESCE(ROUND(AVG(NULLIF((d.ratings ->> 'energyLevel')::numeric, 0)), 2), 0.0),
				'grooming', COALESCE(ROUND(AVG(NULLIF((d.ratings ->> 'grooming')::numeric, 0)), 2), 0.0)
			)
		FROM discussions d
		WHERE d.breed_id = $1 AND d.parent_id IS NULL AND d.ratings IS NOT NULL AND d.is_deleted = FALSE
	`, breedID).Scan(&avgRatingsJSON)

	if err != nil {
		return err
	}

	// 2. Update the cat_breeds table with the new average ratings
	_, err = db.Exec(`
		UPDATE cat_breeds 
		SET 
			average_ratings = $1, 
			discussion_count = (
				SELECT COUNT(id) 
				FROM discussions 
				WHERE breed_id = $2 AND parent_id IS NULL AND is_deleted = FALSE AND ratings IS NOT NULL
			)
		WHERE id = $2
	`, avgRatingsJSON, breedID)

	return err
}


// GET /cats
func GetAllCats(currentUserID *int, limit, offset int, search string) ([]Cat, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	// (เพิ่ม) ดึง average_ratings มาด้วย
	rows, err := db.Query(`
		SELECT 
			cb.id, cb.name, cb.origin, cb.description, cb.care_instructions, cb.image_url,
			cb.like_count, cb.dislike_count, cb.discussion_count, cb.view_count,
			cb.created_at, cb.updated_at, cb.created_by,
			cb.average_ratings, 
			br.reaction_type as user_reaction
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE ($4 = '' OR cb.name ILIKE '%' || $4 || '%')
		ORDER BY cb.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset, search)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cats []Cat
	for rows.Next() {
		var cat Cat
		var userReaction sql.NullString
		var createdBy sql.NullInt64
		var avgRatingsJSON []byte // ตัวแปรรับ JSON

		err := rows.Scan(
			&cat.ID, &cat.Name, &cat.Origin, &cat.Description,
			&cat.Care, &cat.ImageURL,
			&cat.LikeCount, &cat.DislikeCount, &cat.DiscussionCount, &cat.ViewCount,
			&cat.CreatedAt, &cat.UpdatedAt, &createdBy,
			&avgRatingsJSON, // Scan JSON
			&userReaction,
		)
		if err != nil {
			return nil, err
		}

		// แปลง JSON กลับเป็น Map
		if len(avgRatingsJSON) > 0 {
			cat.AverageRatings = make(map[string]float64)
			_ = json.Unmarshal(avgRatingsJSON, &cat.AverageRatings)
		}

		if userReaction.Valid {
			cat.UserReaction = &userReaction.String
		}

		if createdBy.Valid {
			cb := int(createdBy.Int64)
			cat.CreatedBy = &cb
		}

		cats = append(cats, cat)
	}

	return cats, nil
}

// GET /cat
func GetCat(id int, currentUserID *int) (Cat, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	var cat Cat
	var userReaction sql.NullString
	var createdBy sql.NullInt64
	var avgRatingsJSON []byte

	// (เพิ่ม) ดึง average_ratings
	row := db.QueryRow(`
		SELECT 
			cb.id, cb.name, cb.origin, cb.description, cb.care_instructions, cb.image_url,
			cb.like_count, cb.dislike_count, cb.discussion_count, cb.view_count,
			cb.created_at, cb.updated_at, cb.created_by,
			cb.average_ratings,
			br.reaction_type as user_reaction
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE cb.id = $2
	`, userID, id)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.Description,
		&cat.Care, &cat.ImageURL,
		&cat.LikeCount, &cat.DislikeCount, &cat.DiscussionCount, &cat.ViewCount,
		&cat.CreatedAt, &cat.UpdatedAt, &createdBy,
		&avgRatingsJSON,
		&userReaction,
	)

	if err != nil {
		return Cat{}, err
	}

	if len(avgRatingsJSON) > 0 {
		cat.AverageRatings = make(map[string]float64)
		_ = json.Unmarshal(avgRatingsJSON, &cat.AverageRatings)
	}

	if userReaction.Valid {
		cat.UserReaction = &userReaction.String
	}

	if createdBy.Valid {
		cb := int(createdBy.Int64)
		cat.CreatedBy = &cb
	}

	db.Exec("UPDATE cat_breeds SET view_count = view_count + 1 WHERE id = $1", id)

	return cat, nil
}

// CREATE /cat
func CreateCat(userID int, req CreateCatRequest) (Cat, error) {
	var cat Cat
	var createdBy sql.NullInt64

	row := db.QueryRow(`
		INSERT INTO cat_breeds (name, origin, description, care_instructions, image_url, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, origin, description, care_instructions, image_url,
					like_count, dislike_count, discussion_count, view_count,
					created_at, updated_at, created_by
	`, req.Name, req.Origin, req.Description, req.Care, req.ImageURL, userID)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.Description,
		&cat.Care, &cat.ImageURL,
		&cat.LikeCount, &cat.DislikeCount, &cat.DiscussionCount, &cat.ViewCount,
		&cat.CreatedAt, &cat.UpdatedAt, &createdBy,
	)

	if err != nil {
		return Cat{}, err
	}

	if createdBy.Valid {
		cb := int(createdBy.Int64)
		cat.CreatedBy = &cb
	}

	return cat, nil
}

// UPDATE /cat
func UpdateCat(catID int, req UpdateCatRequest) (Cat, error) {
	var cat Cat
	var createdBy sql.NullInt64

	row := db.QueryRow(`
		UPDATE cat_breeds 
		SET name = COALESCE(NULLIF($1, ''), name),
			origin = COALESCE(NULLIF($2, ''), origin),
			description = COALESCE(NULLIF($3, ''), description),
			care_instructions = COALESCE(NULLIF($4, ''), care_instructions),
			image_url = COALESCE(NULLIF($5, ''), image_url),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING id, name, origin, description, care_instructions, image_url,
					like_count, dislike_count, discussion_count, view_count,
					created_at, updated_at, created_by
	`, req.Name, req.Origin, req.Description, req.Care, req.ImageURL, catID)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.Description,
		&cat.Care, &cat.ImageURL,
		&cat.LikeCount, &cat.DislikeCount, &cat.DiscussionCount, &cat.ViewCount,
		&cat.CreatedAt, &cat.UpdatedAt, &createdBy,
	)

	if err != nil {
		return Cat{}, err
	}

	if createdBy.Valid {
		cb := int(createdBy.Int64)
		cat.CreatedBy = &cb
	}

	return cat, nil
}

// DELETE /cat
func DeleteCat(catID int) error {
	result, err := db.Exec(`DELETE FROM cat_breeds WHERE id = $1`, catID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// ===================== Breed Reaction Functions =====================
// (ส่วนนี้เหมือนเดิม)
func ToggleCatReaction(catID, userID int, reactionType string) (ReactionResponse, error) {
	if reactionType != "like" && reactionType != "dislike" {
		return ReactionResponse{}, sql.ErrNoRows
	}

	var existingReaction sql.NullString
	err := db.QueryRow(`
		SELECT reaction_type 
		FROM breed_reactions 
		WHERE breed_id = $1 AND user_id = $2
	`, catID, userID).Scan(&existingReaction)

	if err != nil && err != sql.ErrNoRows {
		return ReactionResponse{}, err
	}

	if existingReaction.Valid {
		if existingReaction.String == reactionType {
			_, err = db.Exec(`
				DELETE FROM breed_reactions 
				WHERE breed_id = $1 AND user_id = $2
			`, catID, userID)
		} else {
			_, err = db.Exec(`
				UPDATE breed_reactions 
				SET reaction_type = $1, updated_at = CURRENT_TIMESTAMP 
				WHERE breed_id = $2 AND user_id = $3
			`, reactionType, catID, userID)
		}
	} else {
		_, err = db.Exec(`
			INSERT INTO breed_reactions (breed_id, user_id, reaction_type) 
			VALUES ($1, $2, $3)
		`, catID, userID, reactionType)
	}

	if err != nil {
		return ReactionResponse{}, err
	}

	var response ReactionResponse
	var userReaction sql.NullString

	err = db.QueryRow(`
		SELECT 
			cb.like_count, 
			cb.dislike_count,
			br.reaction_type
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE cb.id = $2
	`, userID, catID).Scan(
		&response.LikeCount,
		&response.DislikeCount,
		&userReaction,
	)

	if userReaction.Valid {
		response.UserReaction = &userReaction.String
	}

	return response, err
}

func GetCatReactionStats(catID int, currentUserID *int) (ReactionResponse, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	var response ReactionResponse
	var userReaction sql.NullString

	err := db.QueryRow(`
		SELECT 
			cb.like_count, 
			cb.dislike_count,
			br.reaction_type
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE cb.id = $2
	`, userID, catID).Scan(
		&response.LikeCount,
		&response.DislikeCount,
		&userReaction,
	)

	if userReaction.Valid {
		response.UserReaction = &userReaction.String
	}

	return response, err
}

// ===================== Discussion Functions =====================

// GetCatDiscussions
func GetCatDiscussions(catID int, currentUserID *int, limit, offset int) ([]Discussion, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	// (เพิ่ม) ดึง ratings และ tags
	rows, err := db.Query(`
		SELECT 
			d.id, d.breed_id, d.user_id, u.username, d.parent_id,
			d.message, d.like_count, d.dislike_count, d.reply_count,
			d.ratings, d.tags,
			d.is_deleted, d.created_at, d.updated_at,
			dr.reaction_type as user_reaction
		FROM discussions d
		JOIN users u ON d.user_id = u.id
		LEFT JOIN discussion_reactions dr ON d.id = dr.discussion_id AND dr.user_id = $1
		WHERE d.breed_id = $2 AND d.parent_id IS NULL
		ORDER BY d.created_at DESC
		LIMIT $3 OFFSET $4
	`, userID, catID, limit, offset)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var discussions []Discussion
	for rows.Next() {
		var discussion Discussion
		var parentID sql.NullInt64
		var userReaction sql.NullString
		var ratingsJSON []byte      // รับ ratings
		var tagsArray pq.StringArray // รับ tags

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.UserID, &discussion.Username,
			&parentID, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount, 
			&ratingsJSON, &tagsArray,
			&discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
			&userReaction,
		)
		if err != nil {
			return nil, err
		}

		// แปลงข้อมูล
		if len(ratingsJSON) > 0 {
			discussion.Ratings = make(map[string]int)
			_ = json.Unmarshal(ratingsJSON, &discussion.Ratings)
		}
		discussion.Tags = []string(tagsArray)

		if parentID.Valid {
			pid := int(parentID.Int64)
			discussion.ParentID = &pid
		}

		if userReaction.Valid {
			discussion.UserReaction = &userReaction.String
		}

		// Get replies
		replies, _ := GetDiscussionReplies(discussion.ID, currentUserID, 100, 0)
		discussion.Replies = replies

		discussions = append(discussions, discussion)
	}

	return discussions, nil
}

// GetDiscussionReplies
func GetDiscussionReplies(parentID int, currentUserID *int, limit, offset int) ([]Discussion, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	rows, err := db.Query(`
		SELECT 
			d.id, d.breed_id, d.user_id, u.username, d.parent_id,
			d.message, d.like_count, d.dislike_count, d.reply_count,
			d.ratings, d.tags,
			d.is_deleted, d.created_at, d.updated_at,
			dr.reaction_type as user_reaction
		FROM discussions d
		JOIN users u ON d.user_id = u.id
		LEFT JOIN discussion_reactions dr ON d.id = dr.discussion_id AND dr.user_id = $1
		WHERE d.parent_id = $2
		ORDER BY d.created_at ASC
		LIMIT $3 OFFSET $4
	`, userID, parentID, limit, offset)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var discussions []Discussion
	for rows.Next() {
		var discussion Discussion
		var parentIDVal sql.NullInt64
		var userReaction sql.NullString
		var ratingsJSON []byte
		var tagsArray pq.StringArray

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.UserID, &discussion.Username,
			&parentIDVal, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount, 
			&ratingsJSON, &tagsArray,
			&discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
			&userReaction,
		)
		if err != nil {
			return nil, err
		}
		
		if len(ratingsJSON) > 0 {
			discussion.Ratings = make(map[string]int)
			_ = json.Unmarshal(ratingsJSON, &discussion.Ratings)
		}
		discussion.Tags = []string(tagsArray)

		if parentIDVal.Valid {
			pid := int(parentIDVal.Int64)
			discussion.ParentID = &pid
		}

		if userReaction.Valid {
			discussion.UserReaction = &userReaction.String
		}

		discussions = append(discussions, discussion)
	}

	return discussions, nil
}

// CreateDiscussion
func CreateDiscussion(userID int, req CreateDiscussionRequest) (Discussion, error) {
	var discussion Discussion
	var parentID sql.NullInt64
	
	// แปลง Ratings เป็น JSON string
	ratingsJSON, _ := json.Marshal(req.Ratings)

	// บันทึก ratings และ tags ลง Database
	row := db.QueryRow(`
		INSERT INTO discussions (breed_id, user_id, parent_id, message, ratings, tags)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, breed_id, user_id, parent_id, message, 
				  ratings, tags,
				  like_count, dislike_count, reply_count, is_deleted, created_at, updated_at
	`, req.BreedID, userID, req.ParentID, req.Message, ratingsJSON, pq.Array(req.Tags))

	var ratingsBytes []byte
	var tagsArray pq.StringArray

	err := row.Scan(
		&discussion.ID, &discussion.BreedID, &discussion.UserID, &parentID,
		&discussion.Message, 
		&ratingsBytes, &tagsArray,
		&discussion.LikeCount, &discussion.DislikeCount,
		&discussion.ReplyCount, &discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
	)

	if err != nil {
		return Discussion{}, err
	}
	
	if len(ratingsBytes) > 0 {
		discussion.Ratings = make(map[string]int)
		json.Unmarshal(ratingsBytes, &discussion.Ratings)
	}
	discussion.Tags = []string(tagsArray)

	if parentID.Valid {
		pid := int(parentID.Int64)
		discussion.ParentID = &pid
	}

	db.QueryRow("SELECT username FROM users WHERE id = $1", userID).Scan(&discussion.Username)

	// 🚩 เรียกใช้ฟังก์ชัน Update Average Rating 
	// ตรวจสอบว่าเป็นรีวิวหลัก (parent_id IS NULL) และมี Ratings
	if req.ParentID == nil && len(req.Ratings) > 0 {
		if err := CalculateAndSetAverageRatings(req.BreedID); err != nil {
			// ถ้าอัปเดตค่าเฉลี่ยล้มเหลว ให้ส่ง Error กลับไป
			return Discussion{}, err
		}
	}

	return discussion, nil
}

// UpdateDiscussion
func UpdateDiscussion(discussionID, userID int, req UpdateDiscussionRequest) (Discussion, error) {
	var discussion Discussion
	var parentID sql.NullInt64
	var breedID int

	// 1. ดึง breed_id ก่อน
	err := db.QueryRow("SELECT breed_id, parent_id FROM discussions WHERE id = $1", discussionID).Scan(&breedID, &parentID)
	if err != nil {
		return Discussion{}, err
	}

	// แปลง Ratings เป็น JSON
	ratingsJSON, _ := json.Marshal(req.Ratings)

	// แก้ SQL Query: เพิ่ม SET ratings = $2, tags = $3
	row := db.QueryRow(`
		UPDATE discussions 
		SET message = $1, ratings = $2, tags = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND user_id = $5
		RETURNING id, breed_id, user_id, parent_id, message, 
				  ratings, tags,
				  like_count, dislike_count, reply_count, is_deleted, created_at, updated_at
	`, req.Message, ratingsJSON, pq.Array(req.Tags), discussionID, userID)

	var ratingsBytes []byte
	var tagsArray pq.StringArray

	err = row.Scan(
		&discussion.ID, &discussion.BreedID, &discussion.UserID, &parentID,
		&discussion.Message, 
		&ratingsBytes, &tagsArray,
		&discussion.LikeCount, &discussion.DislikeCount,
		&discussion.ReplyCount, &discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
	)

	if err != nil {
		return Discussion{}, err
	}

	if len(ratingsBytes) > 0 {
		discussion.Ratings = make(map[string]int)
		json.Unmarshal(ratingsBytes, &discussion.Ratings)
	}
	discussion.Tags = []string(tagsArray)

	if parentID.Valid {
		pid := int(parentID.Int64)
		discussion.ParentID = &pid
	}

	db.QueryRow("SELECT username FROM users WHERE id = $1", userID).Scan(&discussion.Username)

	// 🚩 ถ้าเป็นการอัปเดตรีวิวหลัก ให้คำนวณค่าเฉลี่ยใหม่
	if parentID.Valid == false && len(discussion.Ratings) > 0 {
		if err := CalculateAndSetAverageRatings(breedID); err != nil {
			return Discussion{}, err
		}
	}


	return discussion, nil
}

// DeleteDiscussion
func DeleteDiscussion(discussionID, userID int, isAdmin bool) error {
	var result sql.Result
	var err error
	var breedID int
	var parentID sql.NullInt64

	// 1. ดึงข้อมูลก่อนลบเพื่อหา breed_id และ parent_id
	err = db.QueryRow("SELECT breed_id, parent_id FROM discussions WHERE id = $1", discussionID).Scan(&breedID, &parentID)
	if err != nil {
		if err == sql.ErrNoRows {
			return sql.ErrNoRows
		}
		return err
	}

	// 2. ทำการ Soft Delete
	if isAdmin {
		result, err = db.Exec(`
			UPDATE discussions 
			SET is_deleted = TRUE, message = '[Deleted by moderator]', updated_at = CURRENT_TIMESTAMP 
			WHERE id = $1
		`, discussionID)
	} else {
		result, err = db.Exec(`
			UPDATE discussions 
			SET is_deleted = TRUE, message = '[Deleted]', updated_at = CURRENT_TIMESTAMP 
			WHERE id = $1 AND user_id = $2
		`, discussionID, userID)
	}

	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}

	// 3. 🚩 ถ้าเป็นการลบรีวิวหลัก ให้คำนวณค่าเฉลี่ยใหม่
	if !parentID.Valid { // parent_id IS NULL
		if err := CalculateAndSetAverageRatings(breedID); err != nil {
			return err
		}
	}


	return nil
}

func ToggleDiscussionReaction(discussionID, userID int, reactionType string) (ReactionResponse, error) {
	if reactionType != "like" && reactionType != "dislike" {
		return ReactionResponse{}, sql.ErrNoRows
	}

	var existingReaction sql.NullString
	err := db.QueryRow(`
		SELECT reaction_type 
		FROM discussion_reactions 
		WHERE discussion_id = $1 AND user_id = $2
	`, discussionID, userID).Scan(&existingReaction)

	if err != nil && err != sql.ErrNoRows {
		return ReactionResponse{}, err
	}

	if existingReaction.Valid {
		if existingReaction.String == reactionType {
			_, err = db.Exec(`
				DELETE FROM discussion_reactions 
				WHERE discussion_id = $1 AND user_id = $2
			`, discussionID, userID)
		} else {
			_, err = db.Exec(`
				UPDATE discussion_reactions 
				SET reaction_type = $1 
				WHERE discussion_id = $2 AND user_id = $3
			`, reactionType, discussionID, userID)
		}
	} else {
		_, err = db.Exec(`
			INSERT INTO discussion_reactions (discussion_id, user_id, reaction_type) 
			VALUES ($1, $2, $3)
		`, discussionID, userID, reactionType)
	}

	if err != nil {
		return ReactionResponse{}, err
	}

	var response ReactionResponse
	var userReaction sql.NullString

	err = db.QueryRow(`
		SELECT 
			d.like_count, 
			d.dislike_count,
			dr.reaction_type
		FROM discussions d
		LEFT JOIN discussion_reactions dr ON d.id = dr.discussion_id AND dr.user_id = $1
		WHERE d.id = $2
	`, userID, discussionID).Scan(
		&response.LikeCount,
		&response.DislikeCount,
		&userReaction,
	)

	if userReaction.Valid {
		response.UserReaction = &userReaction.String
	}

	return response, err
}

// GetDiscussionsByUserID ดึงรีวิวทั้งหมดของ User คนนึง (ปรับปรุงให้ดึงชื่อสายพันธุ์)
func GetDiscussionsByUserID(userID int) ([]Discussion, error) {
	rows, err := db.Query(`
		SELECT 
			d.id, d.breed_id, cb.name as breed_name, d.user_id, u.username, d.parent_id,
			d.message, d.like_count, d.dislike_count, d.reply_count,
			d.ratings, d.tags,
			d.is_deleted, d.created_at, d.updated_at,
			NULL as user_reaction 
		FROM discussions d
		JOIN users u ON d.user_id = u.id
		JOIN cat_breeds cb ON d.breed_id = cb.id
		WHERE d.user_id = $1 AND d.is_deleted = FALSE AND d.parent_id IS NULL 
		ORDER BY d.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var discussions []Discussion
	for rows.Next() {
		var discussion Discussion
		var parentID sql.NullInt64
		var userReaction sql.NullString
		var ratingsJSON []byte
		var tagsArray pq.StringArray

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.BreedName, &discussion.UserID, &discussion.Username,
			&parentID, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount, 
			&ratingsJSON, &tagsArray,
			&discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
			&userReaction,
		)
		if err != nil {
			return nil, err
		}

		if len(ratingsJSON) > 0 {
			discussion.Ratings = make(map[string]int)
			_ = json.Unmarshal(ratingsJSON, &discussion.Ratings)
		}
		discussion.Tags = []string(tagsArray)

		if parentID.Valid {
			pid := int(parentID.Int64)
			discussion.ParentID = &pid
		}

		discussions = append(discussions, discussion)
	}
	return discussions, nil
}

// (ลบฟังก์ชัน ToggleFavorite และ GetUserFavorites ออกตามที่ผู้ใช้แจ้ง)