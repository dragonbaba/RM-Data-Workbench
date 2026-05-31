package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"rm-data-workbench/backend/models"
)

// QuestService provides quest-related operations
type QuestService struct {
	fileService *FileService
}

// NewQuestService creates a new QuestService
func NewQuestService(fileService *FileService) *QuestService {
	return &QuestService{
		fileService: fileService,
	}
}

// LoadQuests loads quests from a file
func (q *QuestService) LoadQuests(filePath string) ([]models.RPGQuest, error) {
	data, err := q.fileService.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	// The JSON is expected to be an array with null at index 0.
	var arr []json.RawMessage
	if err := json.Unmarshal(data, &arr); err != nil {
		return nil, fmt.Errorf("invalid quest data format: %w", err)
	}

	quests := make([]models.RPGQuest, 0, max(len(arr)-1, 0))
	for i := 1; i < len(arr); i++ {
		raw := arr[i]
		if len(raw) == 0 || bytes.Equal(raw, []byte("null")) {
			continue
		}

		var quest models.RPGQuest
		if err := json.Unmarshal(raw, &quest); err != nil {
			continue
		}

		quests = append(quests, quest)
	}

	return quests, nil
}

// SaveQuests saves quests to a file
func (q *QuestService) SaveQuests(filePath string, quests []models.RPGQuest) error {
	// Prepend null to match RPG Maker format
	data := make([]interface{}, 0, len(quests)+1)
	data = append(data, nil)
	for _, quest := range quests {
		data = append(data, quest)
	}

	return q.fileService.WriteJSON(filePath, data)
}

// CreateDefaultQuest creates a default quest
func (q *QuestService) CreateDefaultQuest() models.RPGQuest {
	return models.RPGQuest{
		Title:        "新任务",
		Giver:        "NPC",
		Category:     true,
		Repeatable:   false,
		Difficulty:   1,
		Description:  []string{"描述"},
		Requirements: []models.QuestRequirement{},
		Objectives: []models.QuestObjective{
			{
				Type:          1,
				EnemyID:       1,
				TargetValue:   1,
				CalculateType: true,
				Operator:      ">=",
				Description:   "击杀1个敌人",
				Switches:      []models.SwitchAction{},
				Variables:     []models.VariableAction{},
			},
		},
		Rewards: []models.QuestReward{
			{
				Type:        4,
				TargetValue: 100,
				Description: "获100金币",
			},
		},
		StartSwitches:  []models.SwitchAction{},
		Switches:       []models.SwitchAction{},
		StartVariables: []models.VariableAction{},
		Variables:      []models.VariableAction{},
	}
}

// QuestDataPaths manages quest data file paths
type QuestDataPaths struct {
	System string `json:"system"`
	Item   string `json:"item"`
	Weapon string `json:"weapon"`
	Armor  string `json:"armor"`
	Enemy  string `json:"enemy"`
	Actor  string `json:"actor"`
}

// GetQuestDataPaths returns default quest data paths
func (q *QuestService) GetQuestDataPaths(dataPath string) QuestDataPaths {
	return QuestDataPaths{
		System: filepath.Join(dataPath, "System.json"),
		Item:   filepath.Join(dataPath, "Items.json"),
		Weapon: filepath.Join(dataPath, "Weapons.json"),
		Armor:  filepath.Join(dataPath, "Armors.json"),
		Enemy:  filepath.Join(dataPath, "Enemies.json"),
		Actor:  filepath.Join(dataPath, "Actors.json"),
	}
}

// LoadQuestSystemData loads system data for quests
func (q *QuestService) LoadQuestSystemData(dataPath string) (map[string]interface{}, error) {
	paths := q.GetQuestDataPaths(dataPath)
	result := make(map[string]interface{})

	// Load switches and variables from System.json
	if q.fileService.FileExists(paths.System) {
		data, err := q.fileService.ReadJSON(paths.System)
		if err == nil {
			result["system"] = data
		}
	}

	// Load other data files
	dataTypes := map[string]string{
		"items":   paths.Item,
		"weapons": paths.Weapon,
		"armors":  paths.Armor,
		"enemies": paths.Enemy,
		"actors":  paths.Actor,
	}

	for key, path := range dataTypes {
		if q.fileService.FileExists(path) {
			data, err := q.fileService.ReadJSON(path)
			if err == nil {
				result[key] = data
			}
		}
	}

	return result, nil
}

// IsQuestFile checks if a file is a quest file
func (q *QuestService) IsQuestFile(fileName string) bool {
	lower := strings.ToLower(fileName)
	return strings.Contains(lower, "quest") || lower == "quests.json"
}
