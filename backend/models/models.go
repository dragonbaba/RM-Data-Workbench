package models

// RPGItem represents a generic RPG data item
type RPGItem struct {
	ID           int                    `json:"id"`
	Name         string                 `json:"name"`
	Description  []string               `json:"description,omitempty"`
	Note         string                 `json:"note,omitempty"`
	Meta         map[string]interface{} `json:"meta,omitempty"`
	Params       []int                  `json:"params,omitempty"`
	CustomParams map[string]int         `json:"customParams,omitempty"`
	Scripts      map[string]string      `json:"scripts,omitempty"`
}

// QuestRequirement represents a quest requirement
type QuestRequirement struct {
	Type        int         `json:"type"`
	Description string      `json:"description,omitempty"`
	Operator    string      `json:"operator,omitempty"`
	TargetValue interface{} `json:"targetValue,omitempty"`
	QuestID     int         `json:"questId,omitempty"`
	ActorID     int         `json:"actorId,omitempty"`
	ItemID      int         `json:"itemId,omitempty"`
	WeaponID    int         `json:"weaponId,omitempty"`
	ArmorID     int         `json:"armorId,omitempty"`
	SwitchID    int         `json:"switchId,omitempty"`
	VariableID  int         `json:"variableId,omitempty"`
}

// QuestObjective represents a quest objective
type QuestObjective struct {
	Type          int              `json:"type"`
	EnemyID       int              `json:"enemyId,omitempty"`
	ItemID        int              `json:"itemId,omitempty"`
	WeaponID      int              `json:"weaponId,omitempty"`
	ArmorID       int              `json:"armorId,omitempty"`
	SwitchID      int              `json:"switchId,omitempty"`
	VariableID    int              `json:"variableId,omitempty"`
	TargetValue   interface{}      `json:"targetValue,omitempty"`
	CalculateType bool             `json:"calculateType,omitempty"`
	Operator      string           `json:"operator,omitempty"`
	Description   string           `json:"description,omitempty"`
	Switches      []SwitchAction   `json:"switches,omitempty"`
	Variables     []VariableAction `json:"variables,omitempty"`
}

// QuestReward represents a quest reward
type QuestReward struct {
	Type        int         `json:"type"`
	ItemID      int         `json:"itemId,omitempty"`
	WeaponID    int         `json:"weaponId,omitempty"`
	ArmorID     int         `json:"armorId,omitempty"`
	SwitchID    int         `json:"switchId,omitempty"`
	VariableID  int         `json:"variableId,omitempty"`
	TargetValue interface{} `json:"targetValue,omitempty"`
	Op          string      `json:"op,omitempty"`
	Description string      `json:"description,omitempty"`
}

// SwitchAction represents a switch action
type SwitchAction struct {
	SwitchID int  `json:"switchId"`
	Value    bool `json:"value"`
}

// VariableAction represents a variable action
type VariableAction struct {
	VariableID int    `json:"variableId"`
	Value      int    `json:"value"`
	Op         string `json:"op"`
}

// RPGQuest represents a quest
type RPGQuest struct {
	ID             int                `json:"id,omitempty"`
	Title          string             `json:"title"`
	Giver          string             `json:"giver"`
	Category       bool               `json:"category"`
	Repeatable     bool               `json:"repeatable"`
	Difficulty     int                `json:"difficulty"`
	Description    []string           `json:"description"`
	Requirements   []QuestRequirement `json:"requirements"`
	Objectives     []QuestObjective   `json:"objectives"`
	Rewards        []QuestReward      `json:"rewards"`
	StartSwitches  []SwitchAction     `json:"startSwitches"`
	Switches       []SwitchAction     `json:"switches"`
	StartVariables []VariableAction   `json:"startVariables"`
	Variables      []VariableAction   `json:"variables"`
}

// TrajectorySegment represents a projectile trajectory segment
type TrajectorySegment struct {
	TargetX  int    `json:"targetX"`
	TargetY  int    `json:"targetY"`
	Duration int    `json:"duration"`
	Easing   string `json:"easing"`
}

// ProjectileTemplate represents a projectile template
type ProjectileTemplate struct {
	ID                int                 `json:"id,omitempty"`
	Name              string              `json:"name"`
	AnimationID       int                 `json:"animationId,omitempty"`
	Segments          []TrajectorySegment `json:"segments"`
	StartAnimationID  int                 `json:"startAnimationId,omitempty"`
	LaunchAnimationID int                 `json:"launchAnimationId,omitempty"`
	EndAnimationID    int                 `json:"endAnimationId,omitempty"`
	ActorOffset       map[int]OffsetData  `json:"actorOffset,omitempty"`
	EnemyOffset       map[int]OffsetData  `json:"enemyOffset,omitempty"`
}

// OffsetData represents offset data for actors/enemies
type OffsetData struct {
	X        int `json:"x"`
	Y        int `json:"y"`
	WeaponID int `json:"weaponId,omitempty"`
	SkillID  int `json:"skillId,omitempty"`
}

// EditorConfig represents the editor configuration
type EditorConfig struct {
	ProjectRoot          string `json:"projectRoot"`
	DataPath             string `json:"dataPath"`
	ScriptSavePath       string `json:"scriptSavePath"`
	ScriptPath           string `json:"scriptPath,omitempty"`
	ImagePath            string `json:"imagePath,omitempty"`
	WorkspacePath        string `json:"workspacePath,omitempty"`
	WorkspaceRoot        string `json:"workspaceRoot"`
	Theme                string `json:"theme"`
	AccentColor          string `json:"accentColor"`
	AnimationsEnabled    bool   `json:"animationsEnabled"`
	ThemePreset          string `json:"themePreset"`
	FontSize             string `json:"fontSize"`
	CompactMode          bool   `json:"compactMode"`
	UpdateCheckFrequency string `json:"updateCheckFrequency"`
}

// DataItem is a union type for all data types
type DataItem interface{}

// FileType represents the type of file
type FileType string

const (
	FileTypeData       FileType = "data"
	FileTypeQuest      FileType = "quest"
	FileTypeProjectile FileType = "projectile"
)

// EditorMode represents the editor mode
type EditorMode string

const (
	ModeScript     EditorMode = "script"
	ModeProperty   EditorMode = "property"
	ModeEffect     EditorMode = "effect"
	ModeProjectile EditorMode = "projectile"
	ModeQuest      EditorMode = "quest"
	ModeMap        EditorMode = "map"
	ModeEquip      EditorMode = "equip"
	ModeDrop       EditorMode = "drop"
)
