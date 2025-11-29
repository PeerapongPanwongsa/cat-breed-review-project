package infoDB

import (
	"database/sql"
	"encoding/json"
	"time"
	"fmt"
)


type Cat struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	Origin          string  `json:"origin"`
	History     	string  `json:"history"`
	Appearance  	string  `json:"appearance"`
	Temperament 	string  `json:"temperament"`
	Care            string  `json:"care"`
	ImageURL        string  `json:"image_url"`
	

	LikeCount       int `json:"like_count"`
	DislikeCount    int `json:"dislike_count"`
	DiscussionCount int `json:"discussion_count"`
	ViewCount       int `json:"view_count"`
	
	UserReaction *string `json:"user_reaction,omitempty"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	CreatedBy *int      `json:"created_by,omitempty"`

	AverageRatings map[string]float64 `json:"ratings"`
}

type CreateCatRequest struct {
	Name            string `json:"name" binding:"required,min=2,max=255"`
	Origin          string  `json:"origin"`
	History     	string  `json:"history"`
	Appearance  	string  `json:"appearance"`
	Temperament 	string  `json:"temperament"`
	Care            string  `json:"care"`
	ImageURL        string  `json:"image_url"`
}

type UpdateCatRequest struct {
	Name            string `json:"name" binding:"min=2,max=255"`
	Origin          string  `json:"origin"`
	History     	string  `json:"history"`
	Appearance  	string  `json:"appearance"`
	Temperament 	string  `json:"temperament"`
	Care            string  `json:"care"`
	ImageURL        string  `json:"image_url"`
}


type Discussion struct {
	ID              int           `json:"id"`
	BreedID         int           `json:"breed_id"`

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
	IsOwner      	bool          `json:"is_owner"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Replies         []Discussion  `json:"replies,omitempty"`

	Ratings   map[string]int `json:"ratings"`
	Tags      []string       `json:"tags"`
}

type CreateDiscussionRequest struct {
	BreedID  int    `json:"breed_id" binding:"required"`
	ParentID *int   `json:"parent_id"`
	Message  string `json:"message" binding:"required,min=1,max=2000"`

	Ratings  map[string]int `json:"ratings"`
	Tags     []string       `json:"tags"`
}

type UpdateDiscussionRequest struct {
	Message string         `json:"message" binding:"required,min=1,max=2000"`
	Ratings map[string]int `json:"ratings"`
	Tags    []string       `json:"tags"`
}


type ReactionResponse struct {
	UserReaction *string `json:"user_reaction"`
	LikeCount    int     `json:"like_count"`
	DislikeCount int     `json:"dislike_count"`
}

var db *sql.DB

func SetDB(d *sql.DB) {
	db = d
}

func CalculateAndSetAverageRatings(breedID int) error {
	var avgRatingsJSON []byte


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


func GetAllCats(currentUserID *int, limit, offset int, search string) ([]Cat, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	rows, err := db.Query(`
		SELECT 
			cb.id, cb.name, cb.origin, cb.history, cb.appearance, cb.temperament, cb.care_instructions, cb.image_url,
			cb.like_count, cb.dislike_count, cb.discussion_count, cb.view_count,
			cb.created_at, cb.updated_at, cb.created_by,
			cb.average_ratings, 
			br.reaction_type as user_reaction
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE ($4 = '' OR cb.name ILIKE '%' || $4 || '%')
		ORDER BY cb.name ASC
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
		var avgRatingsJSON []byte
		err := rows.Scan(
			&cat.ID, &cat.Name, &cat.Origin, &cat.History, &cat.Appearance, &cat.Temperament,
			&cat.Care, &cat.ImageURL,
			&cat.LikeCount, &cat.DislikeCount, &cat.DiscussionCount, &cat.ViewCount,
			&cat.CreatedAt, &cat.UpdatedAt, &createdBy,
			&avgRatingsJSON,
			&userReaction,
		)
		if err != nil {
			return nil, err
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

		cats = append(cats, cat)
	}

	return cats, nil
}

func GetCat(id int, currentUserID *int) (Cat, error) {
	var userID int
	if currentUserID != nil {
		userID = *currentUserID
	}

	var cat Cat
	var userReaction sql.NullString
	var createdBy sql.NullInt64
	var avgRatingsJSON []byte

	row := db.QueryRow(`
		SELECT
			cb.id, cb.name, cb.origin, cb.history, cb.appearance, cb.temperament, cb.care_instructions, cb.image_url,
			cb.like_count, cb.dislike_count, cb.discussion_count, cb.view_count,
			cb.created_at, cb.updated_at, cb.created_by,
			cb.average_ratings,
			br.reaction_type as user_reaction
		FROM cat_breeds cb
		LEFT JOIN breed_reactions br ON cb.id = br.breed_id AND br.user_id = $1
		WHERE cb.id = $2
	`, userID, id)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.History, &cat.Appearance, &cat.Temperament,
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

func CreateCat(userID int, req CreateCatRequest) (Cat, error) {
	var cat Cat
	var createdBy sql.NullInt64

	row := db.QueryRow(`
		INSERT INTO cat_breeds (name, origin, history, appearance, temperament, care_instructions, image_url, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, name, origin, history, appearance, temperament, care_instructions, image_url,
					like_count, dislike_count, discussion_count, view_count,
					created_at, updated_at, created_by
	`, req.Name, req.Origin, req.History, req.Appearance, req.Temperament, req.Care, req.ImageURL, userID)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.History, &cat.Appearance, &cat.Temperament,
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

func UpdateCat(catID int, req UpdateCatRequest) (Cat, error) {
	var cat Cat
	var createdBy sql.NullInt64

	row := db.QueryRow(`
		UPDATE cat_breeds
		SET name = COALESCE(NULLIF($1, ''), name),
			origin = COALESCE(NULLIF($2, ''), origin),
			history = COALESCE(NULLIF($3, ''), history),
			appearance = COALESCE(NULLIF($4, ''), appearance),
			temperament = COALESCE(NULLIF($5, ''), temperament),
			care_instructions = COALESCE(NULLIF($6, ''), care_instructions),
			image_url = COALESCE(NULLIF($7, ''), image_url),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING id, name, origin, history, appearance, temperament, care_instructions, image_url,
					like_count, dislike_count, discussion_count, view_count,
					created_at, updated_at, created_by
	`, req.Name, req.Origin, req.History, req.Appearance, req.Temperament, req.Care, req.ImageURL, catID)

	err := row.Scan(
		&cat.ID, &cat.Name, &cat.Origin, &cat.History, &cat.Appearance, &cat.Temperament,
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
		WHERE d.parent_id = $2 AND d.is_deleted = FALSE
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
		var tagsJSON []byte

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.UserID, &discussion.Username,
			&parentIDVal, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount,
			&ratingsJSON, &tagsJSON,
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


		if len(tagsJSON) > 0 {
			var t []string
			if err := json.Unmarshal(tagsJSON, &t); err == nil {
				discussion.Tags = t
			}
		}

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


func GetCatDiscussions(catID int, currentUserID *int, limit, offset int) ([]Discussion, error) {
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
		WHERE d.breed_id = $2 AND d.parent_id IS NULL AND d.is_deleted = FALSE
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
		var ratingsJSON []byte
		var tagsJSON []byte

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.UserID, &discussion.Username,
			&parentID, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount,
			&ratingsJSON, &tagsJSON,
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


		if len(tagsJSON) > 0 {
			var t []string
			if err := json.Unmarshal(tagsJSON, &t); err == nil {
				discussion.Tags = t
			}
		}

		if parentID.Valid {
			pid := int(parentID.Int64)
			discussion.ParentID = &pid
		}

		if userReaction.Valid {
			discussion.UserReaction = &userReaction.String
		}


		discussion.IsOwner = (currentUserID != nil && discussion.UserID == *currentUserID)


		replies, _ := GetDiscussionReplies(discussion.ID, currentUserID, 100, 0)
		discussion.Replies = replies

		discussions = append(discussions, discussion)
	}

	return discussions, nil
}


func CreateDiscussion(userID int, req CreateDiscussionRequest) (Discussion, error) {
	fmt.Println("Received review:", req)
	var discussion Discussion
	var parentID sql.NullInt64


	if req.ParentID != nil {
		var parentBreedID int
		err := db.QueryRow(`SELECT breed_id FROM discussions WHERE id = $1`, *req.ParentID).Scan(&parentBreedID)
		if err != nil {
			if err == sql.ErrNoRows {
				return Discussion{}, fmt.Errorf("parent discussion not found")
			}
			return Discussion{}, err
		}
		if parentBreedID != req.BreedID {
			return Discussion{}, fmt.Errorf("parent discussion belongs to a different breed")
		}
	}


	var ratingsArg interface{} = nil
	if req.Ratings != nil && len(req.Ratings) > 0 {
		b, _ := json.Marshal(req.Ratings)
		ratingsArg = string(b)
	}

	var tagsArg interface{} = nil
	if req.Tags != nil && len(req.Tags) > 0 {
		b, _ := json.Marshal(req.Tags)
		tagsArg = string(b)
	}


	row := db.QueryRow(`
        INSERT INTO discussions (breed_id, user_id, parent_id, message, ratings, tags)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
        RETURNING id, breed_id, user_id, parent_id, message, 
                  ratings, tags,
                  like_count, dislike_count, reply_count, is_deleted, created_at, updated_at
    `, req.BreedID, userID, req.ParentID, req.Message, ratingsArg, tagsArg)

	var ratingsBytes []byte
	var tagsBytes []byte

	err := row.Scan(
		&discussion.ID, &discussion.BreedID, &discussion.UserID, &parentID,
		&discussion.Message,
		&ratingsBytes, &tagsBytes,
		&discussion.LikeCount, &discussion.DislikeCount,
		&discussion.ReplyCount, &discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
	)
	if err != nil {
		return Discussion{}, err
	}


	if len(ratingsBytes) > 0 {
		discussion.Ratings = make(map[string]int)
		_ = json.Unmarshal(ratingsBytes, &discussion.Ratings)
	}


	if len(tagsBytes) > 0 {
		var t []string
		_ = json.Unmarshal(tagsBytes, &t)
		discussion.Tags = t
	}

	if parentID.Valid {
		pid := int(parentID.Int64)
		discussion.ParentID = &pid
	}

	_ = db.QueryRow("SELECT username FROM users WHERE id = $1", userID).Scan(&discussion.Username)
	discussion.IsOwner = true


	if req.ParentID == nil && len(discussion.Ratings) > 0 {
		if err := CalculateAndSetAverageRatings(req.BreedID); err != nil {
			return Discussion{}, err
		}
	}

	return discussion, nil
}


func UpdateDiscussion(discussionID, userID int, req UpdateDiscussionRequest) (Discussion, error) {
	var discussion Discussion
	var parentID sql.NullInt64
	var breedID int


	err := db.QueryRow("SELECT breed_id, parent_id FROM discussions WHERE id = $1", discussionID).Scan(&breedID, &parentID)
	if err != nil {
		return Discussion{}, err
	}


	var ratingsArg interface{} = nil
	if req.Ratings != nil && len(req.Ratings) > 0 {
		b, _ := json.Marshal(req.Ratings)
		ratingsArg = string(b)
	}

	var tagsArg interface{} = nil
	if req.Tags != nil && len(req.Tags) > 0 {
		b, _ := json.Marshal(req.Tags)
		tagsArg = string(b)
	}

	row := db.QueryRow(`
		UPDATE discussions 
		SET message = $1, ratings = $2::jsonb, tags = $3::jsonb, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND user_id = $5
		RETURNING id, breed_id, user_id, parent_id, message, 
				  ratings, tags,
				  like_count, dislike_count, reply_count, is_deleted, created_at, updated_at
	`, req.Message, ratingsArg, tagsArg, discussionID, userID)

	var ratingsBytes []byte
	var tagsBytes []byte

	err = row.Scan(
		&discussion.ID, &discussion.BreedID, &discussion.UserID, &parentID,
		&discussion.Message,
		&ratingsBytes, &tagsBytes,
		&discussion.LikeCount, &discussion.DislikeCount,
		&discussion.ReplyCount, &discussion.IsDeleted, &discussion.CreatedAt, &discussion.UpdatedAt,
	)
	if err != nil {
		return Discussion{}, err
	}

	if len(ratingsBytes) > 0 {
		discussion.Ratings = make(map[string]int)
		_ = json.Unmarshal(ratingsBytes, &discussion.Ratings)
	}
	if len(tagsBytes) > 0 {
		var t []string
		_ = json.Unmarshal(tagsBytes, &t)
		discussion.Tags = t
	}

	if parentID.Valid {
		pid := int(parentID.Int64)
		discussion.ParentID = &pid
	}

	_ = db.QueryRow("SELECT username FROM users WHERE id = $1", userID).Scan(&discussion.Username)


	if !parentID.Valid && len(discussion.Ratings) > 0 {
		if err := CalculateAndSetAverageRatings(breedID); err != nil {
			return Discussion{}, err
		}
	}

	return discussion, nil
}



func DeleteDiscussion(discussionID, userID int, isAdmin bool) error {
	var result sql.Result
	var err error
	var breedID int
	var parentID sql.NullInt64


	err = db.QueryRow("SELECT breed_id, parent_id FROM discussions WHERE id = $1", discussionID).Scan(&breedID, &parentID)
	if err != nil {
		if err == sql.ErrNoRows {
			return sql.ErrNoRows
		}
		return err
	}


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


	if !parentID.Valid {
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
		var tagsJSON []byte

		err := rows.Scan(
			&discussion.ID, &discussion.BreedID, &discussion.BreedName, &discussion.UserID, &discussion.Username,
			&parentID, &discussion.Message, &discussion.LikeCount, &discussion.DislikeCount,
			&discussion.ReplyCount,
			&ratingsJSON, &tagsJSON,
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
		if len(tagsJSON) > 0 {
			var t []string
			if err := json.Unmarshal(tagsJSON, &t); err == nil {
				discussion.Tags = t
			}
		}

		if parentID.Valid {
			pid := int(parentID.Int64)
			discussion.ParentID = &pid
		}

		discussions = append(discussions, discussion)
	}
	return discussions, nil
}