package main

import (
	"database/sql"
	"fmt"
	"log"

	"os"
	"time"
	"strings"
	"backgo/internal/handler"
	"backgo/internal/infoDB"
	"backgo/internal/middleware"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	_ "backgo/docs"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

var db *sql.DB

func initDB() {
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

var allowedOrigins = []string{"http://localhost:3000", "http://127.0.0.1:3000",
							"http://127.0.0.1:8080","http://localhost:8080"}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin || strings.HasPrefix(origin, allowedOrigin) {
				allowed = true
				break
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// @title           Cat Breeds API
// @version         1.0
// @description     Cat Breeds API with auth, reactions and discussions.

// @host            localhost:8080
// @BasePath        /api

func main() {
	initDB()
	infoDB.SetDB(db)
	defer db.Close()

	r := gin.Default()

	r.Use(corsMiddleware())

    r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	public := r.Group("/api")
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Cat Breeds API is running",
			})
		})

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

	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware(), middleware.RequireRole("admin"))
	{
		admin.POST("/cats", handler.CreateCatHandler)
		admin.PUT("/cats/:id", handler.UpdateCatHandler)
		admin.DELETE("/cats/:id", handler.DeleteCatHandler)
	}

	r.Run(":8080")
}