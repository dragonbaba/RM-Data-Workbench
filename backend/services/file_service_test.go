package services

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteJSONCompactsInlineArrays(t *testing.T) {
	service := NewFileService()
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "test.json")

	payload := map[string]interface{}{
		"numbers": []interface{}{1.0, 2.0, 3.0},
		"flags":   []interface{}{true, false},
		"nested": map[string]interface{}{
			"values": []interface{}{"a", "b", "c"},
		},
	}

	if err := service.WriteJSON(filePath, payload); err != nil {
		t.Fatalf("WriteJSON failed: %v", err)
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}

	text := string(content)
	if !strings.Contains(text, `"numbers": [1, 2, 3]`) {
		t.Fatalf("expected primitive array to stay inline, got:\n%s", text)
	}
	if !strings.Contains(text, `"flags": [true, false]`) {
		t.Fatalf("expected bool array to stay inline, got:\n%s", text)
	}
	if !strings.Contains(text, `"values": ["a", "b", "c"]`) {
		t.Fatalf("expected nested string array to stay inline, got:\n%s", text)
	}
}

func TestWriteJSONKeepsLargeArraysMultiline(t *testing.T) {
	service := NewFileService()
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "large.json")

	longArray := make([]interface{}, 0, 40)
	for index := 0; index < 40; index++ {
		longArray = append(longArray, map[string]interface{}{
			"id":   index + 1,
			"name": "Item",
		})
	}

	if err := service.WriteJSON(filePath, map[string]interface{}{"items": longArray}); err != nil {
		t.Fatalf("WriteJSON failed: %v", err)
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}

	text := string(content)
	if !strings.Contains(text, "\"items\": [\n") {
		t.Fatalf("expected large array to remain multiline, got:\n%s", text)
	}
}

func TestWriteJSONKeepsLongScalarArraysInline(t *testing.T) {
	service := NewFileService()
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "scalar-array.json")

	payload := map[string]interface{}{
		"equipSlots": []interface{}{10.0, 11.0, 0.0, 0.0, 0.0, 7.0, 0.0, 8.0, 0.0, 9.0},
	}

	if err := service.WriteJSON(filePath, payload); err != nil {
		t.Fatalf("WriteJSON failed: %v", err)
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}

	text := string(content)
	if !strings.Contains(text, `"equipSlots": [10, 11, 0, 0, 0, 7, 0, 8, 0, 9]`) {
		t.Fatalf("expected scalar array to stay inline, got:\n%s", text)
	}
}

func TestAppendFileAppendsContent(t *testing.T) {
	service := NewFileService()
	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "logs", "log.txt")

	if err := service.AppendFile(filePath, []byte("first line\n")); err != nil {
		t.Fatalf("AppendFile first write failed: %v", err)
	}
	if err := service.AppendFile(filePath, []byte("second line\n")); err != nil {
		t.Fatalf("AppendFile second write failed: %v", err)
	}

	content, err := os.ReadFile(filePath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}

	if string(content) != "first line\nsecond line\n" {
		t.Fatalf("unexpected appended content: %q", string(content))
	}
}
