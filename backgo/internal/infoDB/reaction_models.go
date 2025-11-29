package infoDB

// ReactionRequest is used to toggle like/dislike reactions for cats and discussions.
// swagger:model
type ReactionRequest struct {
    ReactionType string `json:"reaction_type" binding:"required,oneof=like dislike"`
}