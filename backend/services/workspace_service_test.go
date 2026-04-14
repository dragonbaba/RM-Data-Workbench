package services

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestIsBaseWatchedDataFile(t *testing.T) {
	tests := []struct {
		name     string
		expected bool
	}{
		{name: "Actors.json", expected: true},
		{name: "EquipExtensions.json", expected: true},
		{name: "MapInfos.json", expected: true},
		{name: "Map001.json", expected: false},
		{name: "Map1.json", expected: false},
		{name: "Readme.txt", expected: false},
	}

	for _, tc := range tests {
		if actual := isBaseWatchedDataFile(tc.name); actual != tc.expected {
			t.Fatalf("isBaseWatchedDataFile(%q) = %v, want %v", tc.name, actual, tc.expected)
		}
	}
}

func TestIsMapDataFile(t *testing.T) {
	tests := []struct {
		name     string
		expected bool
	}{
		{name: "Map001.json", expected: true},
		{name: "Map999.json", expected: true},
		{name: "Map1000.json", expected: true},
		{name: "Map1.json", expected: true},
		{name: "map042.json", expected: true},
		{name: "MapInfos.json", expected: false},
		{name: "Map.json", expected: false},
		{name: "MapABC.json", expected: false},
		{name: "Actors.json", expected: false},
		{name: "map001.txt", expected: false},
	}

	for _, tc := range tests {
		if actual := isMapDataFile(tc.name); actual != tc.expected {
			t.Fatalf("isMapDataFile(%q) = %v, want %v", tc.name, actual, tc.expected)
		}
	}
}

func TestSetActiveMapFile(t *testing.T) {
	service := &WorkspaceService{}

	service.SetActiveMapFile("D:/Project/data/Map001.json")
	if service.activeMapFile == "" {
		t.Fatalf("expected active map file to be tracked")
	}

	service.SetActiveMapFile("D:/Project/data/Actors.json")
	if service.activeMapFile != "" {
		t.Fatalf("expected non-map file to clear active map file")
	}
}

func TestSetActiveMapFileUpdatesWatchSnapshotBaseline(t *testing.T) {
	dataPath := t.TempDir()
	map001 := filepath.Join(dataPath, "Map001.json")
	map002 := filepath.Join(dataPath, "Map002.json")

	if err := os.WriteFile(map001, []byte(`{"displayName":"A"}`), 0644); err != nil {
		t.Fatalf("write map001: %v", err)
	}
	if err := os.WriteFile(map002, []byte(`{"displayName":"B"}`), 0644); err != nil {
		t.Fatalf("write map002: %v", err)
	}

	service := &WorkspaceService{
		watchSnapshots: map[string]dataFileSnapshot{},
	}

	service.SetActiveMapFile(map001)
	if _, exists := service.watchSnapshots[normalizeDataPathKey(map001)]; !exists {
		t.Fatalf("expected first active map snapshot to be registered")
	}

	service.SetActiveMapFile(map002)
	if _, exists := service.watchSnapshots[normalizeDataPathKey(map001)]; exists {
		t.Fatalf("expected previous active map snapshot to be removed")
	}
	if _, exists := service.watchSnapshots[normalizeDataPathKey(map002)]; !exists {
		t.Fatalf("expected next active map snapshot to be registered")
	}

	service.SetActiveMapFile(filepath.Join(dataPath, "Actors.json"))
	if _, exists := service.watchSnapshots[normalizeDataPathKey(map002)]; exists {
		t.Fatalf("expected active map snapshot to be removed after switching to non-map file")
	}
}

func TestConsumeLocalWriteSuppression(t *testing.T) {
	service := &WorkspaceService{
		localWrites: map[string]time.Time{},
	}

	path := "D:/Project/data/Actors.json"
	service.RecordLocalDataWrite(path)

	if !service.consumeLocalWriteSuppression(path, time.Now()) {
		t.Fatalf("expected local write suppression to be consumed")
	}

	if service.consumeLocalWriteSuppression(path, time.Now()) {
		t.Fatalf("expected local write suppression to be cleared after first consume")
	}
}

func TestLocalWriteSuppressionCoversWatchInterval(t *testing.T) {
	service := &WorkspaceService{
		localWrites: map[string]time.Time{},
	}

	path := "D:/Project/data/Actors.json"
	service.RecordLocalDataWrite(path)

	checkAt := time.Now().Add(dataWatchInterval)
	if !service.consumeLocalWriteSuppression(path, checkAt) {
		t.Fatalf("expected suppression to still be active at watch interval")
	}
}

func TestOptionalDataFilesIncludeEquipExtensions(t *testing.T) {
	for _, fileName := range OptionalDataFiles {
		if fileName == "EquipExtensions.json" {
			return
		}
	}

	t.Fatalf("expected EquipExtensions.json to be listed in OptionalDataFiles")
}
