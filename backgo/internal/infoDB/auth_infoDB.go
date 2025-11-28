package infoDB

// 💡 ต้องเพิ่ม import "strings"
import (
	"encoding/json"
	"fmt"
	"log"
	"strings" // ✅ เพิ่ม sql import สำหรับการจัดการ DB
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ===================== Models =====================
type User struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// UserInfo: ใช้สำหรับส่งกลับไป Frontend
type UserInfo struct {
	ID       int      `json:"id"`
	Username string   `json:"username"`
	Email    string   `json:"email"`
	Roles    []string `json:"roles"`
}

type UserBaseInfo struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// ✅ เพิ่ม RegisterRequest
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=3"`
	Role     string `json:"role"` // รับ role มาจาก frontend (เพื่อกำหนด default)
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type CustomClaims struct {
	UserID   int      `json:"user_id"`
	Username string   `json:"username"`
	Roles    []string `json:"roles"`
	jwt.RegisteredClaims
}

// ===================== JWT Secret =====================
var jwtSecret = []byte("my-super-secret-key-change-in-production-2024")

func SetJWTSecret(secret string) {
	jwtSecret = []byte(secret)
}

// ===================== Password Functions =====================
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func VerifyPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// ===================== JWT Functions =====================
func GenerateAccessToken(userID int, username string, roles []string) (string, error) {
	// ... (โค้ดเดิม)
	expirationTime := time.Now().Add(15 * time.Minute)
	claims := &CustomClaims{
		UserID:   userID,
		Username: username,
		Roles:    roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "bookstore-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func GenerateRefreshToken(userID int, username string) (string, error) {
	// ... (โค้ดเดิม)
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &CustomClaims{
		UserID:   userID,
		Username: username,
		Roles:    []string{},
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "bookstore-api",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func VerifyToken(tokenString string) (*CustomClaims, error) {
	// ... (โค้ดเดิม)
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, fmt.Errorf("invalid token")
}

// ===================== Database Queries =====================

// ✅ ฟังก์ชันใหม่: สร้างผู้ใช้และกำหนดบทบาทเริ่มต้น
func CreateUser(req RegisterRequest) (User, error) {
	// 1. Hash Password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return User{}, fmt.Errorf("failed to hash password: %w", err)
	}

	tx, err := db.Begin()
	if err != nil {
		return User{}, err
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		} else if err != nil {
			tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	// 2. Insert User
	var newUser User
	err = tx.QueryRow(`
		INSERT INTO users (username, email, password_hash, is_active)
		VALUES ($1, $2, $3, TRUE)
		RETURNING id, username, email, is_active, created_at
	`, req.Username, req.Email, hashedPassword).Scan(
		&newUser.ID, &newUser.Username, &newUser.Email, &newUser.IsActive, &newUser.CreatedAt,
	)
	if err != nil {
		// ตรวจสอบ Unique Constraint Error (username/email ซ้ำ)
		if strings.Contains(err.Error(), "duplicate key value") {
			return User{}, fmt.Errorf("username or email already exists")
		}
		return User{}, err
	}

	// 3. Assign Default Role ('user' หรือ 'member')
	// Frontend ส่ง role: 'member' มา แต่ใน DB ใช้ 'user'
	defaultRole := "user"

	_, err = tx.Exec(`
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE name = $2
	`, newUser.ID, defaultRole)

	if err != nil {
		return User{}, fmt.Errorf("failed to assign default role: %w", err)
	}

	return newUser, nil
}

// GetUserByUsername retrieves user by username
func GetUserByUsername(username string) (User, error) {
	// ... (โค้ดเดิม)
	var user User
	query := `SELECT id, username, email, password_hash, is_active, created_at 
			  FROM users WHERE username = $1`

	err := db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.IsActive,
		&user.CreatedAt,
	)

	return user, err
}

// GetUserBaseInfoByID retrieves user's base info by ID
func GetUserBaseInfoByID(userID int) (UserBaseInfo, error) {
	// ... (โค้ดเดิม)
	var info UserBaseInfo
	query := `SELECT id, username, email FROM users WHERE id = $1`

	err := db.QueryRow(query, userID).Scan(
		&info.ID,
		&info.Username,
		&info.Email,
	)
	return info, err
}

// GetUserRoles retrieves all roles for a user
func GetUserRoles(userID int) ([]string, error) {
	// ... (โค้ดเดิม)
	query := `
		SELECT r.name
		FROM roles r
		JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, nil
}

// CheckUserPermission checks if user has specific permission
func CheckUserPermission(userID int, permission string) bool {
	// ... (โค้ดเดิม)
	query := `
		SELECT COUNT(*)
		FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		JOIN user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = $1 AND p.name = $2
	`
	var count int
	err := db.QueryRow(query, userID, permission).Scan(&count)
	if err != nil {
		log.Printf("Error checking permission: %v", err)
		return false
	}
	return count > 0
}

// UpdateLastLogin updates user's last login timestamp
func UpdateLastLogin(userID int) error {
	// ... (โค้ดเดิม)
	query := `UPDATE users SET last_login = NOW() WHERE id = $1`
	_, err := db.Exec(query, userID)
	return err
}

// ===================== Refresh Token Queries =====================

// StoreRefreshToken stores refresh token in database
func StoreRefreshToken(userID int, token string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
	`
	_, err := db.Exec(query, userID, token, expiresAt)
	return err
}

// RevokeRefreshToken revokes a refresh token
func RevokeRefreshToken(token string) error {
	query := `
		UPDATE refresh_tokens
		SET revoked_at = NOW()
		WHERE token = $1 AND revoked_at IS NULL
	`
	_, err := db.Exec(query, token)
	return err
}

// IsRefreshTokenValid checks if refresh token is valid
func IsRefreshTokenValid(token string) (int, bool) {
	query := `
		SELECT user_id
		FROM refresh_tokens
		WHERE token = $1
		AND expires_at > NOW()
		AND revoked_at IS NULL
	`
	var userID int
	err := db.QueryRow(query, token).Scan(&userID)
	if err != nil {
		return 0, false
	}
	return userID, true
}

// ===================== Audit Log =====================

// LogAudit logs user action to audit_logs table
func LogAudit(userID int, action, resource string, resourceID interface{}, details map[string]interface{}, c *gin.Context) {
	detailsJSON, _ := json.Marshal(details)
	query := `
		INSERT INTO audit_logs
		(user_id, action, resource, resource_id, details, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	var resourceIDStr string
	if resourceID != nil {
		resourceIDStr = fmt.Sprintf("%v", resourceID)
	}

	db.Exec(query,
		userID,
		action,
		resource,
		resourceIDStr,
		detailsJSON,
		c.ClientIP(),
		c.GetHeader("User-Agent"),
	)
}
