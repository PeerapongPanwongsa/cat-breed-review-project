package handler

import (
	"database/sql"
	"net/http"
	"strconv"
	"log"

	"backgo/internal/infoDB"

	"github.com/gin-gonic/gin"
)



// GetAllCatsHandler handles GET /api/cats

// GetAllCatsHandler godoc
// @Summary      Get all cats
// @Description  List all cat breeds with optional search and pagination
// @Tags         cats
// @Produce      json
// @Param        limit   query     int     false  "Limit number of results"  default(10)
// @Param        offset  query     int     false  "Offset for pagination"    default(0)
// @Param        q       query     string  false  "Search keyword"
// @Success      200     {object}  map[string]interface{}  "data: []infoDB.Cat, count: int"
// @Failure      500     {object}  map[string]interface{}  "Failed to fetch cat data from database"
// @Router       /cats [get]
func GetAllCatsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	
	search := c.DefaultQuery("q", "")


	var currentUserID *int
	if userID, exists := c.Get("user_id"); exists {
		uid := userID.(int)
		currentUserID = &uid
	}


	cats, err := infoDB.GetAllCats(currentUserID, limit, offset, search)
	
	if err != nil {

		log.Printf("DB Error fetching cats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cat data from database", "details": err.Error()})
		return
	}


	log.Printf("Successfully fetched %d cats.", len(cats))

	c.JSON(http.StatusOK, gin.H{
		"data":  cats,
		"count": len(cats),
	})
}

// GetCatHandler handles GET /api/cats/:id

// GetCatHandler godoc
// @Summary      Get cat by ID
// @Description  Get cat detail by ID
// @Tags         cats
// @Produce      json
// @Param        id   path      int  true  "Cat ID"
// @Success      200  {object}  infoDB.Cat
// @Failure      400  {object}  map[string]interface{}  "Invalid ID"
// @Failure      404  {object}  map[string]interface{}  "Cat not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /cats/{id} [get]
func GetCatHandler(c *gin.Context) {
	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}


	var currentUserID *int
	if userID, exists := c.Get("user_id"); exists {
		uid := userID.(int)
		currentUserID = &uid
	}

	cat, err := infoDB.GetCat(catID, currentUserID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "cat not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cat)
}

// CreateCatHandler handles POST /api/admin/cats (Admin only)

// CreateCatHandler godoc
// @Summary      Create new cat (admin)
// @Description  Create a new cat breed (admin only)
// @Tags         admin, cats
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      infoDB.CreateCatRequest  true  "Cat data"
// @Success      201   {object}  infoDB.Cat
// @Failure      400   {object}  map[string]interface{}  "Invalid request body"
// @Failure      401   {object}  map[string]interface{}  "Unauthorized"
// @Failure      500   {object}  map[string]interface{}  "Internal server error"
// @Router       /admin/cats [post]
func CreateCatHandler(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(int)

	var req infoDB.CreateCatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	cat, err := infoDB.CreateCat(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cat)
}

// UpdateCatHandler handles PUT /api/admin/cats/:id (Admin only)

// UpdateCatHandler godoc
// @Summary      Update cat (admin)
// @Description  Update existing cat breed (admin only)
// @Tags         admin, cats
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id    path      int                      true  "Cat ID"
// @Param        body  body      infoDB.UpdateCatRequest  true  "Updated cat data"
// @Success      200   {object}  infoDB.Cat
// @Failure      400   {object}  map[string]interface{}  "Invalid ID or request body"
// @Failure      401   {object}  map[string]interface{}  "Unauthorized"
// @Failure      404   {object}  map[string]interface{}  "Cat not found"
// @Failure      500   {object}  map[string]interface{}  "Internal server error"
// @Router       /admin/cats/{id} [put]
func UpdateCatHandler(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req infoDB.UpdateCatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	cat, err := infoDB.UpdateCat(catID, req)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "cat not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cat)
}

// DeleteCatHandler handles DELETE /api/admin/cats/:id (Admin only)

// DeleteCatHandler godoc
// @Summary      Delete cat (admin)
// @Description  Delete a cat breed by ID (admin only)
// @Tags         admin, cats
// @Produce      json
// @Security     BearerAuth
// @Param        id   path      int  true  "Cat ID"
// @Success      200  {object}  map[string]interface{}  "Cat deleted successfully"
// @Failure      400  {object}  map[string]interface{}  "Invalid ID"
// @Failure      401  {object}  map[string]interface{}  "Unauthorized"
// @Failure      404  {object}  map[string]interface{}  "Cat not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /admin/cats/{id} [delete]
func DeleteCatHandler(c *gin.Context) {
	_, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = infoDB.DeleteCat(catID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "cat not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "cat deleted successfully"})
}


func ToggleCatReactionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req infoDB.ReactionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	response, err := infoDB.ToggleCatReaction(catID, userID.(int), req.ReactionType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetCatReactionStatsHandler handles GET /api/cats/:id/reactions

// GetCatReactionStatsHandler godoc
// @Summary      Get cat reaction stats
// @Description  Get like/dislike statistics for a cat
// @Tags         cats, reactions
// @Produce      json
// @Param        id   path      int  true  "Cat ID"
// @Success      200  {object}  infoDB.ReactionResponse
// @Failure      400  {object}  map[string]interface{}  "Invalid ID"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /cats/{id}/reactions [get]
func GetCatReactionStatsHandler(c *gin.Context) {
	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var currentUserID *int
	if userID, exists := c.Get("user_id"); exists {
		uid := userID.(int)
		currentUserID = &uid
	}

	response, err := infoDB.GetCatReactionStats(catID, currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ===================== Discussion Handlers =====================

// GetCatDiscussionsHandler handles GET /api/cats/:id/discussions

// GetCatDiscussionsHandler godoc
// @Summary      Get cat discussions
// @Description  Get discussions for a specific cat
// @Tags         discussions
// @Produce      json
// @Param        id      path      int  true  "Cat ID"
// @Param        limit   query     int  false  "Limit"   default(20)
// @Param        offset  query     int  false  "Offset"  default(0)
// @Success      200     {object}  map[string]interface{}  "data: []infoDB.Discussion, count: int"
// @Failure      400     {object}  map[string]interface{}  "Invalid ID"
// @Failure      500     {object}  map[string]interface{}  "Internal server error"
// @Router       /cats/{id}/discussions [get]
func GetCatDiscussionsHandler(c *gin.Context) {
	catID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var currentUserID *int
	if userID, exists := c.Get("user_id"); exists {
		uid := userID.(int)
		currentUserID = &uid
	}

	discussions, err := infoDB.GetCatDiscussions(catID, currentUserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  discussions,
		"count": len(discussions),
	})
}

func CreateDiscussionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req infoDB.CreateDiscussionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	discussion, err := infoDB.CreateDiscussion(userID.(int), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, discussion)
}

func UpdateDiscussionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	discussionID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid discussion id"})
		return
	}

	var req infoDB.UpdateDiscussionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	discussion, err := infoDB.UpdateDiscussion(discussionID, userID.(int), req)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "discussion not found or you don't have permission"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, discussion)
}

func DeleteDiscussionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	discussionID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid discussion id"})
		return
	}

	roles, _ := c.Get("roles")
	isAdmin := false
	if roles != nil {
		for _, role := range roles.([]string) {
			if role == "admin" || role == "moderator" {
				isAdmin = true
				break
			}
		}
	}

	err = infoDB.DeleteDiscussion(discussionID, userID.(int), isAdmin)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "discussion not found or you don't have permission"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "discussion deleted successfully"})
}

func ToggleDiscussionReactionHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	discussionID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid discussion id"})
		return
	}

	var req infoDB.ReactionRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	response, err := infoDB.ToggleDiscussionReaction(discussionID, userID.(int), req.ReactionType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetMyDiscussionsHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	discussions, err := infoDB.GetDiscussionsByUserID(userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	
	c.JSON(http.StatusOK, gin.H{
		"data":  discussions,
		"count": len(discussions),
	})
}