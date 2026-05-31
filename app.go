package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"rm-data-workbench/backend/services"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx              context.Context
	fileService      *services.FileService
	questService     *services.QuestService
	workspaceService *services.WorkspaceService
	currentFile      string
	allowWindowClose bool
}

// NewApp creates a new App application struct
func NewApp() *App {
	fileSvc := services.NewFileService()
	return &App{
		fileService:      fileSvc,
		questService:     services.NewQuestService(fileSvc),
		workspaceService: services.NewWorkspaceService(fileSvc),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.setupMenu()
	a.loadLastWorkspace()
}

func (a *App) shutdown(ctx context.Context) {
	a.workspaceService.StopDataFileWatch()
}

func (a *App) beforeClose(ctx context.Context) bool {
	if a.allowWindowClose {
		a.allowWindowClose = false
		return false
	}

	runtime.EventsEmit(ctx, "app:before-close-request")
	return true
}

// loadLastWorkspace attempts to load the last opened workspace
func (a *App) loadLastWorkspace() {
	workspace, err := a.workspaceService.LoadWorkspaceState()
	if err != nil || workspace == nil {
		return
	}

	a.startWorkspaceDataWatch()

	// Delay emitting event to give frontend time to set up listeners
	go func() {
		time.Sleep(500 * time.Millisecond)
		runtime.EventsEmit(a.ctx, "workspace:loaded", workspace)
	}()
}

// setupMenu creates the application menu
func (a *App) setupMenu() {
	appMenu := menu.NewMenu()

	// File menu
	fileMenu := appMenu.AddSubmenu("文件")
	fileMenu.AddText("打开项目文件夹", keys.CmdOrCtrl("o"), func(cd *menu.CallbackData) {
		a.OpenProjectDialog()
	})
	fileMenu.AddText("打开数据文件", keys.CmdOrCtrl("d"), func(cd *menu.CallbackData) {
		a.OpenFileDialog()
	})
	fileMenu.AddText("保存全部", keys.CmdOrCtrl("s"), func(cd *menu.CallbackData) {
		a.SaveAllFiles()
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("退出", keys.CmdOrCtrl("q"), func(cd *menu.CallbackData) {
		runtime.Quit(a.ctx)
	})

	// Edit menu
	editMenu := appMenu.AddSubmenu("编辑")
	editMenu.AddText("撤销", keys.CmdOrCtrl("z"), nil)
	editMenu.AddText("重做", keys.CmdOrCtrl("y"), nil)
	editMenu.AddSeparator()
	editMenu.AddText("剪切", keys.CmdOrCtrl("x"), nil)
	editMenu.AddText("复制", keys.CmdOrCtrl("c"), nil)
	editMenu.AddText("粘贴", keys.CmdOrCtrl("v"), nil)
	editMenu.AddSeparator()
	editMenu.AddText("新建脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:create")
	})
	editMenu.AddText("复制脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:copy")
	})
	editMenu.AddText("重命名脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:rename")
	})
	editMenu.AddSeparator()
	editMenu.AddText("保存当前脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:save-current")
	})
	editMenu.AddText("保存全部脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:save-all")
	})
	editMenu.AddSeparator()
	editMenu.AddText("删除脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:delete")
	})
	editMenu.AddText("删除全部脚本", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "script:delete-all")
	})

	// Data menu
	dataMenu := appMenu.AddSubmenu("数据")
	dataMenu.AddText("系统 (System.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "system")
	})
	dataMenu.AddSeparator()
	dataMenu.AddText("角色 (Actors.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "actors")
	})
	dataMenu.AddText("职业 (Classes.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "classes")
	})
	dataMenu.AddText("公共事件 (CommonEvents.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "commonEvents")
	})
	dataMenu.AddText("敌人 (Enemies.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "enemies")
	})
	dataMenu.AddText("物品 (Items.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "items")
	})
	dataMenu.AddText("武器 (Weapons.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "weapons")
	})
	dataMenu.AddText("防具 (Armors.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "armors")
	})
	dataMenu.AddText("技能 (Skills.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "skills")
	})
	dataMenu.AddText("动画 (Animations.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "animations")
	})
	dataMenu.AddText("状态 (States.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "states")
	})
	dataMenu.AddText("敌群 (Troops.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "troops")
	})
	dataMenu.AddSeparator()
	dataMenu.AddText("地图 (MapInfos.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "maps")
	})
	dataMenu.AddSeparator()
	dataMenu.AddText("任务 (Quests.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "quests")
	})
	dataMenu.AddText("弹道 (Projectiles.json)", nil, func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "data:select", "projectiles")
	})

	// Mode menu
	modeMenu := appMenu.AddSubmenu("模式")
	modeMenu.AddText("代码模式", keys.Key("f2"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "script")
	})
	modeMenu.AddText("属性模式", keys.Key("f3"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "property")
	})
	modeMenu.AddText("任务模式", keys.Key("f5"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "quest")
	})
	modeMenu.AddText("弹道模式", keys.Key("f6"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "projectile")
	})
	modeMenu.AddText("装备模式", keys.Key("f7"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "equip")
	})
	modeMenu.AddText("改造模式", keys.Key("f10"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "refit")
	})
	modeMenu.AddText("效果模式", keys.Key("f8"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "effect")
	})
	modeMenu.AddText("掉落模式", keys.Key("f9"), func(cd *menu.CallbackData) {
		runtime.EventsEmit(a.ctx, "mode:change", "drop")
	})

	// Help menu
	helpMenu := appMenu.AddSubmenu("帮助")
	helpMenu.AddText("关于", nil, func(cd *menu.CallbackData) {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.InfoDialog,
			Title:   "关于",
			Message: "RPG数据拓展编辑器 v1.0.0\n基于 Go + Wails + React 构建",
		})
	})

	runtime.MenuSetApplicationMenu(a.ctx, appMenu)
}

// OpenProjectDialog opens a directory dialog for selecting RPG Maker project
func (a *App) OpenProjectDialog() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择 RPG Maker 项目文件夹",
	})
	if err != nil {
		return "", err
	}
	if selection == "" {
		return "", nil
	}

	// Validate and create workspace
	workspace, err := a.workspaceService.CreateWorkspace(selection)
	if err != nil {
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "无效的项目",
			Message: err.Error(),
		})
		return "", err
	}

	// Save workspace state
	a.workspaceService.SaveWorkspaceState()
	a.workspaceService.AddRecentWorkspace(selection)
	a.startWorkspaceDataWatch()

	// Emit event to frontend
	runtime.EventsEmit(a.ctx, "workspace:loaded", workspace)

	return selection, nil
}

// ReadImageFile reads an image file and returns it as base64 encoded data URL
func (a *App) ReadImageFile(imagePath string) (string, error) {
	if imagePath == "" {
		return "", nil
	}

	data, err := os.ReadFile(imagePath)
	if err != nil {
		return "", err
	}

	// Determine content type based on file extension
	ext := strings.ToLower(filepath.Ext(imagePath))
	var contentType string
	switch ext {
	case ".png":
		contentType = "image/png"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".gif":
		contentType = "image/gif"
	case ".bmp":
		contentType = "image/bmp"
	case ".webp":
		contentType = "image/webp"
	default:
		contentType = "image/png"
	}

	// Encode to base64
	base64Data := base64.StdEncoding.EncodeToString(data)
	dataURL := fmt.Sprintf("data:%s;base64,%s", contentType, base64Data)

	return dataURL, nil
}

// OpenFileDialog opens a file dialog and returns the selected file path
func (a *App) OpenFileDialog() (string, error) {
	workspace := a.workspaceService.GetCurrentWorkspace()

	dialogOptions := runtime.OpenDialogOptions{
		Title: "选择数据文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON 文件 (*.json)",
				Pattern:     "*.json",
			},
			{
				DisplayName: "所有文件 (*.*)",
				Pattern:     "*.*",
			},
		},
	}

	if workspace != nil {
		dialogOptions.DefaultDirectory = workspace.DataPath
	}

	selection, err := runtime.OpenFileDialog(a.ctx, dialogOptions)
	if err != nil {
		return "", err
	}
	if selection == "" {
		return "", nil
	}

	a.currentFile = selection
	a.workspaceService.SetActiveMapFile(selection)
	return selection, nil
}

// SaveFileDialog opens a save file dialog
func (a *App) SaveFileDialog(defaultName string) (string, error) {
	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "保存文件",
		DefaultFilename:  defaultName,
		DefaultDirectory: filepath.Dir(a.currentFile),
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON 文件 (*.json)",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if selection == "" {
		return "", nil
	}

	a.currentFile = selection
	return selection, nil
}

// SaveCurrentFile saves the current file
func (a *App) SaveCurrentFile() error {
	if a.currentFile == "" {
		return nil
	}
	runtime.EventsEmit(a.ctx, "file:save-request", a.currentFile)
	return nil
}

// SaveAllFiles emits event to save all dirty files
func (a *App) SaveAllFiles() error {
	runtime.EventsEmit(a.ctx, "file:save-all-request")
	return nil
}

func (a *App) ProceedClose() {
	a.allowWindowClose = true
	runtime.Quit(a.ctx)
}

// GetCurrentFile returns the current file path
func (a *App) GetCurrentFile() string {
	return a.currentFile
}

// SetCurrentFile sets the current file path
func (a *App) SetCurrentFile(filePath string) {
	a.currentFile = filePath
	a.workspaceService.SetActiveMapFile(filePath)
}

// GetCurrentWorkspace returns the current workspace
func (a *App) GetCurrentWorkspace() *services.Workspace {
	return a.workspaceService.GetCurrentWorkspace()
}

// GetWorkspaceDataFiles returns all data files in current workspace
func (a *App) GetWorkspaceDataFiles() map[string]string {
	return a.workspaceService.ListDataFiles()
}

// DetectFileType detects the type of a data file
func (a *App) DetectFileType(filename string) string {
	return a.workspaceService.DetectFileType(filename)
}

// GetRecentWorkspaces returns list of recent workspaces
func (a *App) GetRecentWorkspaces() ([]string, error) {
	return a.workspaceService.GetRecentWorkspaces()
}

// ReadFile reads a file and returns its contents
func (a *App) ReadFile(filePath string) ([]byte, error) {
	return a.fileService.ReadFile(filePath)
}

// ReadFileString reads a file and returns contents as string
func (a *App) ReadFileString(filePath string) (string, error) {
	return a.fileService.ReadFileString(filePath)
}

// ReadJSON reads a JSON file and returns the parsed data
func (a *App) ReadJSON(filePath string) (interface{}, error) {
	return a.fileService.ReadJSON(filePath)
}

// WriteFile writes data to a file
func (a *App) WriteFile(filePath string, data []byte) error {
	return a.fileService.WriteFile(filePath, data)
}

// WriteJSON writes data as JSON to a file
func (a *App) WriteJSON(filePath string, data interface{}) error {
	a.workspaceService.RecordLocalDataWrite(filePath)
	return a.fileService.WriteJSON(filePath, data)
}

// AppendEditorLog appends a log entry to the editor-local log.txt file.
func (a *App) AppendEditorLog(content string) error {
	if strings.TrimSpace(content) == "" {
		return nil
	}
	return a.fileService.AppendFile(a.resolveEditorLogPath(), []byte(content))
}

// DeleteFile deletes a file
func (a *App) DeleteFile(filePath string) error {
	return a.fileService.DeleteFile(filePath)
}

// FileExists checks if a file exists
func (a *App) FileExists(filePath string) bool {
	return a.fileService.FileExists(filePath)
}

// GetFileStat returns file existence and size
func (a *App) GetFileStat(filePath string) (services.FileStat, error) {
	return a.fileService.StatFile(filePath)
}

// GetFileReadInfo returns diagnostics for reading a file
func (a *App) GetFileReadInfo(filePath string) (services.FileReadInfo, error) {
	return a.fileService.ReadFileInfo(filePath)
}

// ListDtsFiles lists all .d.ts files in a directory
func (a *App) ListDtsFiles(workspaceRoot string) ([]string, error) {
	if workspaceRoot == "" {
		return []string{}, nil
	}
	files, err := a.fileService.ListFilesRecursive(workspaceRoot, ".d.ts")
	if err != nil {
		return []string{}, err
	}
	return files, nil
}

// GetDefaultQuest returns a default quest template
func (a *App) GetDefaultQuest() interface{} {
	return a.questService.CreateDefaultQuest()
}

// GetAppDataDir returns the application data directory
func (a *App) GetAppDataDir() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(homeDir, ".rpg-editor")
}

func (a *App) resolveEditorLogPath() string {
	executablePath, err := os.Executable()
	if err == nil && executablePath != "" {
		return filepath.Join(filepath.Dir(executablePath), "log.txt")
	}

	workingDir, err := os.Getwd()
	if err == nil && workingDir != "" {
		return filepath.Join(workingDir, "log.txt")
	}

	return "log.txt"
}

func (a *App) startWorkspaceDataWatch() {
	if a.ctx == nil {
		return
	}

	err := a.workspaceService.StartDataFileWatch(func(change services.DataFileChange) {
		runtime.EventsEmit(a.ctx, "data:file-changed", change)
	})
	if err != nil {
		fmt.Printf("failed to start data file watch: %v\n", err)
	}
}
