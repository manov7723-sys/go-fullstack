package auth

import (
	"fmt"
	"regexp"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// Password requirements
const (
	MinPasswordLength = 8
	MaxPasswordLength = 128
)

// Password strength requirements
type PasswordStrength struct {
	HasMinLength    bool
	HasUpperCase    bool
	HasLowerCase    bool
	HasNumber       bool
	HasSpecialChar  bool
	IsValid         bool
	Suggestions     []string
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	// Validate password strength before hashing
	strength := ValidatePasswordStrength(password)
	if !strength.IsValid {
		return "", fmt.Errorf("password does not meet requirements: %v", strength.Suggestions)
	}

	// Hash password with bcrypt
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hashedBytes), nil
}

// CheckPassword checks if a password matches a hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePasswordStrength validates password strength requirements
func ValidatePasswordStrength(password string) PasswordStrength {
	strength := PasswordStrength{
		HasMinLength:   len(password) >= MinPasswordLength,
		HasUpperCase:   false,
		HasLowerCase:   false,
		HasNumber:      false,
		HasSpecialChar: false,
		Suggestions:    []string{},
	}

	// Check for uppercase letters
	for _, char := range password {
		if unicode.IsUpper(char) {
			strength.HasUpperCase = true
			break
		}
	}

	// Check for lowercase letters
	for _, char := range password {
		if unicode.IsLower(char) {
			strength.HasLowerCase = true
			break
		}
	}

	// Check for numbers
	for _, char := range password {
		if unicode.IsNumber(char) {
			strength.HasNumber = true
			break
		}
	}

	// Check for special characters
	specialCharRegex := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`)
	strength.HasSpecialChar = specialCharRegex.MatchString(password)

	// Determine if password is valid
	strength.IsValid = strength.HasMinLength && strength.HasUpperCase && 
		strength.HasLowerCase && strength.HasNumber && strength.HasSpecialChar

	// Generate suggestions for improvement
	if !strength.HasMinLength {
		strength.Suggestions = append(strength.Suggestions, 
			fmt.Sprintf("Password must be at least %d characters long", MinPasswordLength))
	}
	if !strength.HasUpperCase {
		strength.Suggestions = append(strength.Suggestions, 
			"Password must contain at least one uppercase letter")
	}
	if !strength.HasLowerCase {
		strength.Suggestions = append(strength.Suggestions, 
			"Password must contain at least one lowercase letter")
	}
	if !strength.HasNumber {
		strength.Suggestions = append(strength.Suggestions, 
			"Password must contain at least one number")
	}
	if !strength.HasSpecialChar {
		strength.Suggestions = append(strength.Suggestions, 
			"Password must contain at least one special character")
	}

	return strength
}

// GeneratePasswordStrengthMessage generates a user-friendly message about password strength
func GeneratePasswordStrengthMessage(strength PasswordStrength) string {
	if strength.IsValid {
		return "Password meets all requirements"
	}

	message := "Password requirements not met:\n"
	for i, suggestion := range strength.Suggestions {
		message += fmt.Sprintf("%d. %s\n", i+1, suggestion)
	}

	return message
}

// IsPasswordStrong checks if a password meets all strength requirements
func IsPasswordStrong(password string) bool {
	strength := ValidatePasswordStrength(password)
	return strength.IsValid
}

// GetPasswordStrengthScore returns a score from 0-100 for password strength
func GetPasswordStrengthScore(password string) int {
	strength := ValidatePasswordStrength(password)
	score := 0

	if strength.HasMinLength {
		score += 20
	}
	if strength.HasUpperCase {
		score += 20
	}
	if strength.HasLowerCase {
		score += 20
	}
	if strength.HasNumber {
		score += 20
	}
	if strength.HasSpecialChar {
		score += 20
	}

	// Bonus points for length
	if len(password) >= 12 {
		score += 10
	} else if len(password) >= 10 {
		score += 5
	}

	// Cap at 100
	if score > 100 {
		score = 100
	}

	return score
}

// GetPasswordStrengthLabel returns a label for password strength
func GetPasswordStrengthLabel(password string) string {
	score := GetPasswordStrengthScore(password)

	switch {
	case score >= 90:
		return "Very Strong"
	case score >= 80:
		return "Strong"
	case score >= 70:
		return "Good"
	case score >= 60:
		return "Fair"
	case score >= 40:
		return "Weak"
	default:
		return "Very Weak"
	}
} 