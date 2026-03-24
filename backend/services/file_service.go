package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FileService provides file operations
type FileService struct{}

const inlineJSONWidthLimit = 160
const inlineScalarArrayWidthLimit = 640

// FileStat describes basic file stats
type FileStat struct {
	Exists bool  `json:"exists"`
	Size   int64 `json:"size"`
}

// FileReadInfo provides diagnostics for file reads
type FileReadInfo struct {
	Exists    bool   `json:"exists"`
	Size      int64  `json:"size"`
	ReadBytes int    `json:"readBytes"`
	Error     string `json:"error"`
}

// NewFileService creates a new FileService
func NewFileService() *FileService {
	return &FileService{}
}

// ReadFile reads a file and returns its contents as bytes
func (f *FileService) ReadFile(filePath string) ([]byte, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	return data, nil
}

// ReadFileString reads a file and returns its contents as string
func (f *FileService) ReadFileString(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(data), nil
}

// ReadFileInfo returns diagnostics for reading a file
func (f *FileService) ReadFileInfo(filePath string) (FileReadInfo, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return FileReadInfo{Exists: false, Size: 0, ReadBytes: 0, Error: ""}, nil
		}
		return FileReadInfo{}, err
	}

	data, readErr := os.ReadFile(filePath)
	readInfo := FileReadInfo{
		Exists:    true,
		Size:      info.Size(),
		ReadBytes: len(data),
		Error:     "",
	}
	if readErr != nil {
		readInfo.Error = readErr.Error()
	}
	return readInfo, nil
}

// ReadJSON reads a JSON file and returns the parsed data
func (f *FileService) ReadJSON(filePath string) (interface{}, error) {
	data, err := f.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return result, nil
}

// WriteFile writes data to a file
func (f *FileService) WriteFile(filePath string, data []byte) error {
	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// WriteJSON writes data as JSON to a file
func (f *FileService) WriteJSON(filePath string, data interface{}) error {
	normalizedData, err := normalizeJSONValue(data)
	if err != nil {
		return fmt.Errorf("failed to normalize JSON: %w", err)
	}

	jsonData := append(formatPrettyJSON(normalizedData, "  ", 0), '\n')
	return f.WriteFile(filePath, jsonData)
}

func normalizeJSONValue(data interface{}) (interface{}, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var normalized interface{}
	if err := json.Unmarshal(raw, &normalized); err != nil {
		return nil, err
	}

	return normalized, nil
}

func formatPrettyJSON(value interface{}, indent string, level int) []byte {
	if level > 0 && isInlineScalarJSONArray(value) {
		inline := formatInlineJSON(value)
		if len(inline) <= inlineScalarArrayWidthLimit {
			return inline
		}
	}

	if level > 0 && isInlineJSONCandidate(value) {
		inline := formatInlineJSON(value)
		if len(inline) <= inlineJSONWidthLimit {
			return inline
		}
	}

	switch typed := value.(type) {
	case []interface{}:
		return formatJSONArray(typed, indent, level)
	case map[string]interface{}:
		return formatJSONObject(typed, indent, level)
	default:
		raw, _ := json.Marshal(typed)
		return raw
	}
}

func formatInlineJSON(value interface{}) []byte {
	switch typed := value.(type) {
	case []interface{}:
		if len(typed) == 0 {
			return []byte("[]")
		}

		var buffer bytes.Buffer
		buffer.WriteByte('[')
		for index, item := range typed {
			if index > 0 {
				buffer.WriteString(", ")
			}
			buffer.Write(formatInlineJSON(item))
		}
		buffer.WriteByte(']')
		return buffer.Bytes()
	case map[string]interface{}:
		if len(typed) == 0 {
			return []byte("{}")
		}

		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		var buffer bytes.Buffer
		buffer.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				buffer.WriteString(", ")
			}
			keyJSON, _ := json.Marshal(key)
			buffer.Write(keyJSON)
			buffer.WriteString(": ")
			buffer.Write(formatInlineJSON(typed[key]))
		}
		buffer.WriteByte('}')
		return buffer.Bytes()
	default:
		raw, _ := json.Marshal(typed)
		return raw
	}
}

func formatJSONArray(items []interface{}, indent string, level int) []byte {
	if len(items) == 0 {
		return []byte("[]")
	}

	var buffer bytes.Buffer
	currentIndent := strings.Repeat(indent, level)
	nextIndent := strings.Repeat(indent, level+1)

	buffer.WriteByte('[')
	buffer.WriteByte('\n')
	for index, item := range items {
		buffer.WriteString(nextIndent)
		buffer.Write(formatPrettyJSON(item, indent, level+1))
		if index < len(items)-1 {
			buffer.WriteByte(',')
		}
		buffer.WriteByte('\n')
	}
	buffer.WriteString(currentIndent)
	buffer.WriteByte(']')
	return buffer.Bytes()
}

func formatJSONObject(value map[string]interface{}, indent string, level int) []byte {
	if len(value) == 0 {
		return []byte("{}")
	}

	keys := make([]string, 0, len(value))
	for key := range value {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var buffer bytes.Buffer
	currentIndent := strings.Repeat(indent, level)
	nextIndent := strings.Repeat(indent, level+1)

	buffer.WriteByte('{')
	buffer.WriteByte('\n')
	for index, key := range keys {
		keyJSON, _ := json.Marshal(key)
		buffer.WriteString(nextIndent)
		buffer.Write(keyJSON)
		buffer.WriteString(": ")
		buffer.Write(formatPrettyJSON(value[key], indent, level+1))
		if index < len(keys)-1 {
			buffer.WriteByte(',')
		}
		buffer.WriteByte('\n')
	}
	buffer.WriteString(currentIndent)
	buffer.WriteByte('}')
	return buffer.Bytes()
}

func isInlineJSONCandidate(value interface{}) bool {
	switch typed := value.(type) {
	case nil, bool, string, float64:
		return true
	case []interface{}:
		for _, item := range typed {
			if !isInlineJSONCandidate(item) {
				return false
			}
		}
		return true
	case map[string]interface{}:
		for _, item := range typed {
			if !isInlineJSONCandidate(item) {
				return false
			}
		}
		return true
	default:
		return false
	}
}

func isScalarJSONValue(value interface{}) bool {
	switch value.(type) {
	case nil, bool, string, float64:
		return true
	default:
		return false
	}
}

func isInlineScalarJSONArray(value interface{}) bool {
	items, ok := value.([]interface{})
	if !ok {
		return false
	}

	for _, item := range items {
		if !isScalarJSONValue(item) {
			return false
		}
	}

	return true
}

// DeleteFile deletes a file
func (f *FileService) DeleteFile(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file path is empty")
	}
	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

// FileExists checks if a file exists
func (f *FileService) FileExists(filePath string) bool {
	_, err := os.Stat(filePath)
	return !os.IsNotExist(err)
}

// StatFile returns file existence and size
func (f *FileService) StatFile(filePath string) (FileStat, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return FileStat{Exists: false, Size: 0}, nil
		}
		return FileStat{}, err
	}
	return FileStat{Exists: true, Size: info.Size()}, nil
}

// ListFiles lists files in a directory with optional extension filter
func (f *FileService) ListFiles(dirPath string, extension string) ([]string, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		if extension != "" && filepath.Ext(entry.Name()) != extension {
			continue
		}

		files = append(files, entry.Name())
	}

	return files, nil
}

// ListFilesRecursive lists files recursively with optional extension filter
func (f *FileService) ListFilesRecursive(dirPath string, extension string) ([]string, error) {
	var files []string
	skipDirs := map[string]struct{}{
		".git":         {},
		"node_modules": {},
		"dist":         {},
		"build":        {},
	}

	err := filepath.WalkDir(dirPath, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if _, shouldSkip := skipDirs[strings.ToLower(d.Name())]; shouldSkip && path != dirPath {
				return filepath.SkipDir
			}
			return nil
		}
		if extension != "" && !strings.HasSuffix(d.Name(), extension) {
			return nil
		}
		files = append(files, path)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}
	return files, nil
}

// JoinPath joins path elements
func (f *FileService) JoinPath(elem ...string) string {
	return filepath.Join(elem...)
}

// GetDir returns the directory of a file path
func (f *FileService) GetDir(filePath string) string {
	return filepath.Dir(filePath)
}

// GetBase returns the last element of a file path
func (f *FileService) GetBase(filePath string) string {
	return filepath.Base(filePath)
}
