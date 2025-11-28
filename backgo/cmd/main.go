package main

import (
	"database/sql"
	"fmt"
	"log"

	"os"
	"time"

	"backgo/internal/handler"
	"backgo/internal/infoDB"
	"backgo/internal/middleware"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

var db *sql.DB

func initDB() {
	// ... (โค้ดเดิม)
	var err error
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "catbase_user")
	password := getEnv("DB_PASSWORD", "your_strong_password")
	name := getEnv("DB_NAME", "catbase")

	conStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, name)

	db, err = sql.Open("postgres", conStr)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(20)
	db.SetConnMaxLifetime(5 * time.Minute)

	err = db.Ping()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to the database successfully!")
}

// เพิ่ม URL ที่อนุญาตให้เข้าถึง (สำคัญสำหรับการใช้ withCredentials)
var allowedOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000"}

// ฟังก์ชันจัดการ CORS ที่ยืดหยุ่นสำหรับ Development
func corsMiddleware() gin.HandlerFunc {
	// ... (โค้ดเดิม)
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// ถ้า Origin ถูกส่งมา และถูกอนุญาต, ให้ Mirror Origin นั้นทันที และอนุญาต Credentials
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin != "" {
			// กรณีที่ Origin ไม่ตรง แต่มี Origin ส่งมา เราจะไม่ส่ง Allow-Credentials
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Header ที่เหลือเหมือนเดิม
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {
	initDB()
	infoDB.SetDB(db)
	defer db.Close()

	r := gin.Default()

	r.Use(corsMiddleware())

	// ===================== PUBLIC ROUTES =====================
	public := r.Group("/api")
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Cat Breeds API is running",
			})
		})

		// ✅ เพิ่ม Route สำหรับการลงทะเบียนผู้ใช้ใหม่ (POST /api/users)
		public.POST("/users", handler.RegisterHandler)

		auth := public.Group("/auth")
		{
			auth.POST("/login", handler.LoginHandler)
			auth.POST("/refresh", handler.RefreshTokenHandler)
			auth.POST("/logout", handler.LogoutHandler)
		}

		public.GET("/cats", handler.GetAllCatsHandler)
		public.GET("/cats/:id", handler.GetCatHandler)
		public.GET("/cats/:id/reactions", handler.GetCatReactionStatsHandler)
		public.GET("/cats/:id/discussions", handler.GetCatDiscussionsHandler)
	}

	// ===================== USER PROTECTED ROUTES =====================
	user := r.Group("/api")
	user.Use(middleware.AuthMiddleware())
	{
		user.GET("/auth/me", handler.GetMeHandler)
		user.GET("/discussions/me", handler.GetMyDiscussionsHandler)
		user.POST("/cats/:id/react", handler.ToggleCatReactionHandler)

		user.POST("/discussions", handler.CreateDiscussionHandler)
		user.PUT("/discussions/:id", handler.UpdateDiscussionHandler)
		user.DELETE("/discussions/:id", handler.DeleteDiscussionHandler)
		user.POST("/discussions/:id/react", handler.ToggleDiscussionReactionHandler)
	}

	// ===================== ADMIN ROUTES =====================
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.RequireRole("admin"))
	{
		admin.POST("/cats", handler.CreateCatHandler)
		admin.PUT("/cats/:id", handler.UpdateCatHandler)
		admin.DELETE("/cats/:id", handler.DeleteCatHandler)
	}

	r.Run(":8080")
}
