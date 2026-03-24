package services

import (
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
