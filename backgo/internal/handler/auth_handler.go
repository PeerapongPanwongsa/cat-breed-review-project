package handler

import (
	"database/sql"
	"net/http"
	"time"
	"os"
	"backgo/internal/infoDB"

	"github.com/gin-gonic/gin"
)


// RegisterHandler handles POST /api/register

// RegisterHandler godoc
// @Summary      Register new user
// @Description  Create a new user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      infoDB.RegisterRequest  true  "Register info"
// @Success      201   {object}  map[string]interface{}  "User created successfully"
// @Failure      400   {object}  map[string]interface{}  "Invalid request body"
// @Failure      409   {object}  map[string]interface{}  "Username or Email already exists"
// @Failure      500   {object}  map[string]interface{}  "Internal server error"
// @Router       /register [post]
func RegisterHandler(c *gin.Context) {
	var req infoDB.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	user, err := infoDB.CreateUser(req)

	if err != nil {
		if err.Error() == "username or email already exists" {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or Email is already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": err.Error()})
		return
	}

	infoDB.LogAudit(user.ID, "register", "auth", nil, gin.H{"username": user.Username}, c)

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user_id": user.ID,
	})
}

// LoginHandler handles POST /api/auth/login

// LoginHandler godoc
// @Summary      Login
// @Description  Authenticate user and issue tokens (via cookies)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      infoDB.LoginRequest  true  "Login credentials"
// @Success      200   {object}  map[string]interface{}  "User info with roles"
// @Failure      400   {object}  map[string]interface{}  "Invalid request"
// @Failure      401   {object}  map[string]interface{}  "Invalid credentials or account disabled"
// @Failure      500   {object}  map[string]interface{}  "Internal server error"
// @Router       /auth/login [post]
func LoginHandler(c *gin.Context) {
	var req infoDB.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	user, err := infoDB.GetUserByUsername(req.Username)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "account is disabled"})
		return
	}

	if err := infoDB.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	roles, _ := infoDB.GetUserRoles(user.ID)

	accessToken, _ := infoDB.GenerateAccessToken(user.ID, user.Username, roles)
	refreshToken, _ := infoDB.GenerateRefreshToken(user.ID, user.Username)

	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	_ = infoDB.StoreRefreshToken(user.ID, refreshToken, expiresAt)

	_ = infoDB.UpdateLastLogin(user.ID)

	infoDB.LogAudit(user.ID, "login", "auth", nil, gin.H{"username": user.Username}, c)

	domain := ""
	secure := false
	if os.Getenv("ENV") == "production" {
    	domain = "my-backend.vercel.app"
    	secure = true
	}

	c.SetCookie("access_token", accessToken, 900, "/", domain, secure, true)
	c.SetCookie("refresh_token", refreshToken, 604800, "/", domain, secure, true)

	c.JSON(http.StatusOK, gin.H{
		"user": infoDB.UserInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
			Roles:    roles,
		},
	})
}

func RefreshTokenHandler(c *gin.Context) {

	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {

		var req infoDB.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}
		refreshToken = req.RefreshToken
	}


	userID, valid := infoDB.IsRefreshTokenValid(refreshToken)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
		return
	}

	userBaseInfo, err := infoDB.GetUserBaseInfoByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user details"})
		return
	}

	roles, _ := infoDB.GetUserRoles(userID)


	accessToken, _ := infoDB.GenerateAccessToken(userID, userBaseInfo.Username, roles)


	c.SetCookie("access_token", accessToken, 900, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "token refreshed successfully",
	})
}

// LogoutHandler handles POST /api/auth/logout

// LogoutHandler godoc
// @Summary      Logout
// @Description  Clear access and refresh tokens, revoke refresh token
// @Tags         auth
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "Logged out successfully"
// @Router       /auth/logout [post]
func LogoutHandler(c *gin.Context) {

	refreshToken, err := c.Cookie("refresh_token")
	if err == nil {
		// Revoke refresh token if exists
		_ = infoDB.RevokeRefreshToken(refreshToken)
	}


	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "logged out successfully",
	})
}


func GetMeHandler(c *gin.Context) {

	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(int)

	userInfo, err := infoDB.GetUserBaseInfoByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user info"})
		return
	}

	roles, err := infoDB.GetUserRoles(userID)
	if err != nil {

		roles = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"user": infoDB.UserInfo{
			ID:       userInfo.ID,
			Username: userInfo.Username,
			Email:    userInfo.Email,
			Roles:    roles,
		},
	})
}