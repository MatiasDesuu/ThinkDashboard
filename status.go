package main

import (
	"crypto/tls"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"time"
)

// PingURL checks the status and response time of a bookmark URL
func (h *Handlers) PingURL(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers first
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Get URL from query parameter
	urlParam := r.URL.Query().Get("url")
	if urlParam == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "URL parameter is required",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Parse and validate URL
	parsedURL, err := url.Parse(urlParam)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "Invalid URL",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Validate that the URL belongs to a registered bookmark
	allBookmarks := h.store.GetAllBookmarks()
	isValidBookmark := false
	for _, bookmark := range allBookmarks {
		if bookmark.URL == urlParam {
			isValidBookmark = true
			break
		}
	}
	if !isValidBookmark {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "URL is not a registered bookmark",
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Extract host and port
	host := parsedURL.Hostname()
	port := parsedURL.Port()
	if port == "" {
		if parsedURL.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}

	// Get skipFastPing query parameter
	skipFastPing := r.URL.Query().Get("skipFastPing")

	// Start timing
	start := time.Now()

	if skipFastPing == "" {
		// Try TCP connection first (fast ping)
		address := net.JoinHostPort(host, port)
		conn, err := net.DialTimeout("tcp", address, 2*time.Second)

		if err == nil {
			conn.Close()
			elapsed := time.Since(start).Milliseconds()
			// Ensure minimum of 1ms for display purposes
			if elapsed < 1 {
				elapsed = 1
			}

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "online",
				"ping":   elapsed,
			})
			return
		}
	}

	// If TCP fails (or fast ping disabled), try a quick HTTP request as fallback
	client := &http.Client{
		Timeout: 3 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
			DialContext: (&net.Dialer{
				Timeout: 2 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   2 * time.Second,
			ResponseHeaderTimeout: 2 * time.Second,
		},
	}

	req, err := http.NewRequest("GET", urlParam, nil)
	if err != nil {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "offline",
			"ping":   nil,
		})
		return
	}

	// Add User-Agent header to avoid being blocked by some servers
	req.Header.Set("User-Agent", "ThinkDashboard-Ping/1.0")

	resp, err := client.Do(req)
	if resp != nil {
		defer resp.Body.Close()
	}

	elapsed := time.Since(start).Milliseconds()
	// Ensure minimum of 1ms for display purposes
	if elapsed < 1 {
		elapsed = 1
	}

	if err == nil && resp != nil && resp.StatusCode >= 200 && resp.StatusCode < 500 {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "online",
			"ping":   elapsed,
		})
		return
	}

	// Offline
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "offline",
		"ping":   nil,
	})
}
