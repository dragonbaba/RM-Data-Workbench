package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Workspace represents an RPG Maker project workspace
type Workspace struct {
	ProjectRoot        string            `json:"projectRoot"`
	DataPath           string            `json:"dataPath"`
	ScriptPath         string            `json:"scriptPath"`
	ImagePath          string            `json:"imagePath"`
	WorkspacePath      string            `json:"workspacePath"`
	ProjectName        string            `json:"projectName"`
	DataFiles          map[string]string `json:"dataFiles"` // filename -> filepath
	LastOpenedFile     string            `json:"lastOpenedFile"`
	LastOpenedFileType string            `json:"lastOpenedFileType"`
}

// WorkspaceService manages RPG Maker project workspaces
type WorkspaceService struct {
	fileService      *FileService
	currentWorkspace *Workspace
	configDir        string
	watchMu          sync.Mutex
	watchStopCh      chan struct{}
	watchDoneCh      chan struct{}
	watchSnapshots   map[string]dataFileSnapshot
	localWrites      map[string]time.Time
	activeMapFile    string
}

type DataFileChange struct {
	FilePath   string `json:"filePath"`
	FileName   string `json:"fileName"`
	ChangeType string `json:"changeType"`
}

type dataFileSnapshot struct {
	Exists  bool
	Size    int64
	ModTime time.Time
}

const (
	dataWatchInterval           = 4 * time.Second
	localWriteSuppressionWindow = dataWatchInterval + 2*time.Second
)

// NewWorkspaceService creates a new WorkspaceService
func NewWorkspaceService(fileService *FileService) *WorkspaceService {
	homeDir, _ := os.UserHomeDir()
	configDir := filepath.Join(homeDir, ".rpg-editor")

	return &WorkspaceService{
		fileService: fileService,
		configDir:   configDir,
		localWrites: make(map[string]time.Time),
	}
}

// ValidateProject checks if a directory is a valid RPG Maker project
func (w *WorkspaceService) ValidateProject(projectRoot string) (bool, error) {
	if projectRoot == "" {
		return false, fmt.Errorf("project root is empty")
	}

	// Check if data directory exists
	dataPath := filepath.Join(projectRoot, "data")
	if !w.fileService.FileExists(dataPath) {
		return false, fmt.Errorf("data directory not found in %s", projectRoot)
	}

	// Check for at least one core data file
	coreFiles := []string{"System.json", "Actors.json", "Items.json"}
	foundCore := false
	for _, file := range coreFiles {
		if w.fileService.FileExists(filepath.Join(dataPath, file)) {
			foundCore = true
			break
		}
	}

	if !foundCore {
		return false, fmt.Errorf("no core data files found in %s", dataPath)
	}

	return true, nil
}

// CreateWorkspace creates a new workspace from a project directory
func (w *WorkspaceService) CreateWorkspace(projectRoot string) (*Workspace, error) {
	valid, err := w.ValidateProject(projectRoot)
	if !valid {
		return nil, err
	}

	// Normalize path
	projectRoot = filepath.Clean(projectRoot)
	projectName := filepath.Base(projectRoot)

	workspace := &Workspace{
		ProjectRoot:   projectRoot,
		DataPath:      filepath.Join(projectRoot, "data"),
		ScriptPath:    filepath.Join(projectRoot, "scripts"),
		ImagePath:     filepath.Join(projectRoot, "img"),
		WorkspacePath: filepath.Join(projectRoot, "workspace"),
		ProjectName:   projectName,
		DataFiles:     make(map[string]string),
	}

	// Discover all data files
	w.discoverDataFiles(workspace)

	w.currentWorkspace = workspace
	return workspace, nil
}

// discoverDataFiles scans the data directory and catalogs all JSON files
func (w *WorkspaceService) discoverDataFiles(workspace *Workspace) {
	if workspace.DataPath == "" {
		return
	}

	entries, err := os.ReadDir(workspace.DataPath)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if strings.HasSuffix(strings.ToLower(name), ".json") {
			workspace.DataFiles[name] = filepath.Join(workspace.DataPath, name)
		}
	}
}

func normalizeDataPathKey(filePath string) string {
	normalized := filepath.ToSlash(filepath.Clean(filePath))
	if len(normalized) >= 3 && normalized[1] == ':' && normalized[2] == '/' {
		return strings.ToLower(normalized)
	}
	return normalized
}

func isBaseWatchedDataFile(fileName string) bool {
	lower := strings.ToLower(strings.TrimSpace(fileName))
	if lower == "" || !strings.HasSuffix(lower, ".json") {
		return false
	}

	switch lower {
	case "actors.json",
		"animations.json",
		"armors.json",
		"classes.json",
		"commonevents.json",
		"effects.json",
		"equipextensions.json",
		"enemies.json",
		"items.json",
		"mapinfos.json",
		"projectiles.json",
		"quests.json",
		"skills.json",
		"states.json",
		"system.json",
		"troops.json",
		"weapons.json":
		return true
	}

	return false
}

func isMapDataFile(fileName string) bool {
	lower := strings.ToLower(strings.TrimSpace(fileName))
	if !strings.HasPrefix(lower, "map") || !strings.HasSuffix(lower, ".json") {
		return false
	}
	middle := lower[3 : len(lower)-5] // digits between "map" and ".json"
	if len(middle) == 0 {
		return false
	}
	for _, c := range middle {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func (w *WorkspaceService) scanDataFileSnapshots(dataPath string) map[string]dataFileSnapshot {
	snapshots := make(map[string]dataFileSnapshot)
	if dataPath == "" {
		return snapshots
	}

	entries, err := os.ReadDir(dataPath)
	if err != nil {
		return snapshots
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !isBaseWatchedDataFile(name) {
			continue
		}

		fullPath := filepath.Join(dataPath, name)
		info, err := os.Stat(fullPath)
		if err != nil {
			continue
		}

		snapshots[normalizeDataPathKey(fullPath)] = dataFileSnapshot{
			Exists:  true,
			Size:    info.Size(),
			ModTime: info.ModTime(),
		}
	}

	w.watchMu.Lock()
	activeMapFile := w.activeMapFile
	w.watchMu.Unlock()

	if activeMapFile != "" {
		info, err := os.Stat(activeMapFile)
		if err == nil {
			snapshots[normalizeDataPathKey(activeMapFile)] = dataFileSnapshot{
				Exists:  true,
				Size:    info.Size(),
				ModTime: info.ModTime(),
			}
		}
	}

	return snapshots
}

func (w *WorkspaceService) consumeLocalWriteSuppression(filePath string, now time.Time) bool {
	normalized := normalizeDataPathKey(filePath)

	w.watchMu.Lock()
	defer w.watchMu.Unlock()

	expireAt, exists := w.localWrites[normalized]
	if !exists {
		return false
	}

	delete(w.localWrites, normalized)
	return now.Before(expireAt) || now.Equal(expireAt)
}

func (w *WorkspaceService) RecordLocalDataWrite(filePath string) {
	if filePath == "" {
		return
	}

	normalized := normalizeDataPathKey(filePath)
	fileName := filepath.Base(normalized)
	if !isBaseWatchedDataFile(fileName) && !isMapDataFile(fileName) {
		return
	}

	w.watchMu.Lock()
	defer w.watchMu.Unlock()

	if w.localWrites == nil {
		w.localWrites = make(map[string]time.Time)
	}
	w.localWrites[normalized] = time.Now().Add(localWriteSuppressionWindow)
}

func (w *WorkspaceService) SetActiveMapFile(filePath string) {
	normalized := normalizeDataPathKey(filePath)
	if normalized != "" && !isMapDataFile(filepath.Base(normalized)) {
		normalized = ""
	}

	w.watchMu.Lock()
	defer w.watchMu.Unlock()

	previous := w.activeMapFile
	if previous == normalized {
		return
	}

	w.activeMapFile = normalized
	if w.watchSnapshots == nil {
		return
	}

	if previous != "" {
		delete(w.watchSnapshots, previous)
	}
	if normalized == "" {
		return
	}

	info, err := os.Stat(normalized)
	if err != nil {
		return
	}
	w.watchSnapshots[normalized] = dataFileSnapshot{
		Exists:  true,
		Size:    info.Size(),
		ModTime: info.ModTime(),
	}
}

func (w *WorkspaceService) StopDataFileWatch() {
	w.watchMu.Lock()
	stopCh := w.watchStopCh
	doneCh := w.watchDoneCh
	w.watchStopCh = nil
	w.watchDoneCh = nil
	w.watchSnapshots = nil
	w.watchMu.Unlock()

	if stopCh != nil {
		close(stopCh)
	}
	if doneCh != nil {
		<-doneCh
	}
}

func (w *WorkspaceService) StartDataFileWatch(onChange func(DataFileChange)) error {
	w.StopDataFileWatch()

	if w.currentWorkspace == nil || w.currentWorkspace.DataPath == "" {
		return nil
	}

	dataPath := w.currentWorkspace.DataPath
	initialSnapshots := w.scanDataFileSnapshots(dataPath)
	stopCh := make(chan struct{})
	doneCh := make(chan struct{})

	w.watchMu.Lock()
	w.watchStopCh = stopCh
	w.watchDoneCh = doneCh
	w.watchSnapshots = initialSnapshots
	w.watchMu.Unlock()

	go func() {
		defer close(doneCh)

		ticker := time.NewTicker(dataWatchInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				w.pollDataFileChanges(dataPath, onChange)
			case <-stopCh:
				return
			}
		}
	}()

	return nil
}

func (w *WorkspaceService) pollDataFileChanges(dataPath string, onChange func(DataFileChange)) {
	nextSnapshots := w.scanDataFileSnapshots(dataPath)

	w.watchMu.Lock()
	prevSnapshots := w.watchSnapshots
	if prevSnapshots == nil {
		prevSnapshots = make(map[string]dataFileSnapshot)
	}
	w.watchSnapshots = nextSnapshots
	workspace := w.currentWorkspace
	w.watchMu.Unlock()

	now := time.Now()

	for filePath, nextSnapshot := range nextSnapshots {
		prevSnapshot, existedBefore := prevSnapshots[filePath]
		changeType := ""

		switch {
		case !existedBefore && nextSnapshot.Exists:
			changeType = "create"
		case existedBefore && nextSnapshot.Exists && (!prevSnapshot.ModTime.Equal(nextSnapshot.ModTime) || prevSnapshot.Size != nextSnapshot.Size):
			changeType = "write"
		}

		if changeType == "" {
			continue
		}
		if w.consumeLocalWriteSuppression(filePath, now) {
			continue
		}

		fileName := filepath.Base(filePath)
		if workspace != nil && workspace.DataFiles != nil {
			workspace.DataFiles[fileName] = filePath
		}
		if onChange != nil {
			onChange(DataFileChange{
				FilePath:   filePath,
				FileName:   fileName,
				ChangeType: changeType,
			})
		}
	}

	if workspace == nil || workspace.DataFiles == nil {
		return
	}

	for filePath := range prevSnapshots {
		if _, exists := nextSnapshots[filePath]; exists {
			continue
		}

		fileName := filepath.Base(filePath)
		delete(workspace.DataFiles, fileName)
		if onChange != nil {
			onChange(DataFileChange{
				FilePath:   filePath,
				FileName:   fileName,
				ChangeType: "remove",
			})
		}
	}
}

// GetCurrentWorkspace returns the current workspace
func (w *WorkspaceService) GetCurrentWorkspace() *Workspace {
	return w.currentWorkspace
}

// GetDataFilePath returns the full path for a data file
func (w *WorkspaceService) GetDataFilePath(filename string) string {
	if w.currentWorkspace == nil {
		return ""
	}

	if path, exists := w.currentWorkspace.DataFiles[filename]; exists {
		return path
	}

	// Fallback: construct path
	return filepath.Join(w.currentWorkspace.DataPath, filename)
}

// ListDataFiles returns all discovered data files
func (w *WorkspaceService) ListDataFiles() map[string]string {
	if w.currentWorkspace == nil {
		return make(map[string]string)
	}
	return w.currentWorkspace.DataFiles
}

// DetectFileType intelligently detects the type of a data file
func (w *WorkspaceService) DetectFileType(filename string) string {
	lower := strings.ToLower(filename)

	switch {
	case strings.Contains(lower, "quest"):
		return "quest"
	case strings.Contains(lower, "projectile"):
		return "projectile"
	case strings.Contains(lower, "classe"):
		return "data"
	case strings.Contains(lower, "commonevent"):
		return "data"
	case strings.Contains(lower, "actor"):
		return "data"
	case strings.Contains(lower, "item"):
		return "data"
	case strings.Contains(lower, "weapon"):
		return "data"
	case strings.Contains(lower, "armor"):
		return "data"
	case strings.Contains(lower, "enemy"):
		return "data"
	case strings.Contains(lower, "skill"):
		return "data"
	case strings.Contains(lower, "animation"):
		return "data"
	case strings.Contains(lower, "mapinfos"):
		return "map"
	case strings.HasPrefix(lower, "map") && strings.HasSuffix(lower, ".json"):
		return "map"
	case strings.Contains(lower, "system"):
		return "system"
	default:
		return "data"
	}
}

// SaveWorkspaceState saves the current workspace state to disk
func (w *WorkspaceService) SaveWorkspaceState() error {
	if w.currentWorkspace == nil {
		return fmt.Errorf("no workspace to save")
	}

	// Ensure config directory exists
	if err := os.MkdirAll(w.configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	stateFile := filepath.Join(w.configDir, "workspace.json")
	data, err := json.MarshalIndent(w.currentWorkspace, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal workspace: %w", err)
	}

	return os.WriteFile(stateFile, data, 0644)
}

// LoadWorkspaceState loads the last workspace state from disk
func (w *WorkspaceService) LoadWorkspaceState() (*Workspace, error) {
	stateFile := filepath.Join(w.configDir, "workspace.json")

	if !w.fileService.FileExists(stateFile) {
		return nil, nil
	}

	data, err := os.ReadFile(stateFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read workspace state: %w", err)
	}

	var workspace Workspace
	if err := json.Unmarshal(data, &workspace); err != nil {
		return nil, fmt.Errorf("failed to unmarshal workspace: %w", err)
	}

	// Validate the loaded workspace still exists
	valid, _ := w.ValidateProject(workspace.ProjectRoot)
	if !valid {
		return nil, fmt.Errorf("saved workspace no longer exists")
	}

	// Rediscover data files (in case they changed)
	w.discoverDataFiles(&workspace)
	w.currentWorkspace = &workspace

	return &workspace, nil
}

// GetRecentWorkspaces returns a list of recently opened workspaces
func (w *WorkspaceService) GetRecentWorkspaces() ([]string, error) {
	recentFile := filepath.Join(w.configDir, "recent.json")

	if !w.fileService.FileExists(recentFile) {
		return []string{}, nil
	}

	data, err := os.ReadFile(recentFile)
	if err != nil {
		return nil, err
	}

	var recent []string
	if err := json.Unmarshal(data, &recent); err != nil {
		return nil, err
	}

	return recent, nil
}

// AddRecentWorkspace adds a workspace to recent list
func (w *WorkspaceService) AddRecentWorkspace(projectRoot string) error {
	recent, _ := w.GetRecentWorkspaces()

	// Remove if already exists
	for i, path := range recent {
		if path == projectRoot {
			recent = append(recent[:i], recent[i+1:]...)
			break
		}
	}

	// Add to front
	recent = append([]string{projectRoot}, recent...)

	// Keep only last 10
	if len(recent) > 10 {
		recent = recent[:10]
	}

	if err := os.MkdirAll(w.configDir, 0755); err != nil {
		return err
	}

	recentFile := filepath.Join(w.configDir, "recent.json")
	data, err := json.MarshalIndent(recent, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(recentFile, data, 0644)
}

// Core data files that should be present in a valid project
var CoreDataFiles = []string{
	"Actors.json",
	"Animations.json",
	"Armors.json",
	"Classes.json",
	"CommonEvents.json",
	"Enemies.json",
	"Items.json",
	"Skills.json",
	"States.json",
	"System.json",
	"Troops.json",
	"Weapons.json",
}

// Optional data files
var OptionalDataFiles = []string{
	"Effects.json",
	"Quests.json",
	"Projectiles.json",
	"MapInfos.json",
	"EquipExtensions.json",
}
