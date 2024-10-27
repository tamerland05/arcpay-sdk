package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Order represents the structure of an order in the shop database
type Order struct {
	UUID   string `json:"uuid"`
	Status string `json:"status"`
}

// ShopDatabase is an in-memory store for orders
var shopDatabase = make(map[string]Order)

// Load environment variables
func loadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
}

// Verify HMAC signature
func verifySignature(payload []byte, signature string) bool {
	privateKey := os.Getenv("PRIVATE_KEY")
	mac := hmac.New(sha256.New, []byte(privateKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

// Handle Webhook for order status updates
func handleWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("X-Signature")
	if signature == "" {
		http.Error(w, "Missing signature header", http.StatusBadRequest)
		return
	}

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	if !verifySignature(payload, signature) {
		http.Error(w, "Invalid signature", http.StatusForbidden)
		return
	}

	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	log.Println("Webhook received:", data)

	if event, ok := data["event"].(string); ok && event == "order.status.changed" {
		orderData := data["data"].(map[string]interface{})
		orderID := orderData["uuid"].(string)
		status := orderData["status"].(string)

		shopDatabase[orderID] = Order{
			UUID:   orderID,
			Status: status,
		}

		if status == "received" {
			log.Printf("Order %s received successfully!", orderID)
		}
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status": "Webhook received successfully"}`)
}

// Create a new order by sending a request to ArcPay API
func createOrder(w http.ResponseWriter, r *http.Request) {
	arcKey := os.Getenv("ARC_KEY")
	url := "https://arcpay.online/api/v1/arcpay/order"

	orderData := map[string]interface{}{
		"title":    "Premium Subscription Box",
		"orderId":  fmt.Sprintf("INV-%d", time.Now().Unix()),
		"currency": "TON",
		"items": []map[string]interface{}{
			{
				"title":       "Exclusive Travel Package",
				"description": "A luxurious 5-day trip to Bali with first-class accommodation.",
				"imageUrl":    "https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg",
				"price":       0.500,
				"count":       1,
				"itemId":      "id-987654",
			},
			{
				"title":       "Gourmet Dinner Experience",
				"description": "A 7-course gourmet dinner at a Michelin-starred restaurant.",
				"imageUrl":    "https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg",
				"price":       0.150,
				"count":       2,
				"itemId":      "id-654321",
			},
		},
		"meta": map[string]interface{}{
			"telegram_id": r.FormValue("telegram_id"),
		},
		"captured": false,
	}

	orderJSON, err := json.Marshal(orderData)
	if err != nil {
		http.Error(w, "Failed to encode order data", http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(orderJSON))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("ArcKey", arcKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to send request to ArcPay", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("Failed to create order. Status: %d, Error: %s", resp.StatusCode, string(body))
		http.Error(w, "Failed to create order", resp.StatusCode)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response body", http.StatusInternalServerError)
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		http.Error(w, "Invalid response format", http.StatusInternalServerError)
		return
	}

	orderID := result["uuid"].(string)
	shopDatabase[orderID] = Order{
		UUID:   orderID,
		Status: "created",
	}
	log.Println("Order created successfully:", result)

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// Get current shop database
func getShopDatabase(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shopDatabase)
}

func main() {
	loadEnv()

	http.HandleFunc("/webhook", handleWebhook)
	http.HandleFunc("/create", createOrder)
	http.HandleFunc("/", getShopDatabase)

	port := os.Getenv("PORT")
	log.Printf("Server is running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
