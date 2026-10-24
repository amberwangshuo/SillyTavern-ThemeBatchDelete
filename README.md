# SillyTavern 批量删除（Batch Delete）

酒馆（SillyTavern）里的删除按钮一次只能删一个。这个扩展加一个批量删除工具，支持：

- **UI 主题**
- **世界书**
- **预设**：聊天补全、文本补全、KoboldAI、NovelAI、指令模板、上下文模板、系统提示词、推理模板
- **正则**：全局、预设内、角色内
- **背景图**

另外，**主题支持批量导入**：「UI 主题」的导入按钮旁边多一个按钮，一次可以选多个主题 JSON 文件。

每一项都可以先点「眼睛」查看内容，看完再决定勾不勾选。勾选可以跨标签页累积，最后一次删除。

在 SillyTavern 1.19.0 上实测过。

## 安装

在酒馆里打开「扩展」面板，点「安装扩展」，粘贴这个仓库的地址：

```
https://github.com/amberwangshuo/SillyTavern-ThemeBatchDelete
```

装好后刷新页面。已经装过旧版（只有主题）的，在「扩展 → 管理扩展」里更新即可。

也可以手动安装：把本仓库整个文件夹放到酒馆的 `public/scripts/extensions/third-party/SillyTavern-ThemeBatchDelete/`，然后刷新页面。

## 在哪里打开

每个相关面板的删除按钮旁边都有一个扫帚按钮，点开后直接落在对应的标签页：

- 用户设置 → UI 主题
- 世界书面板（删除按钮旁）
- 各个预设选择框的删除按钮旁
- 扩展面板 → 正则（调试器按钮旁）
- 背景图面板（上传按钮旁）

「扩展」面板里也有一个「批量删除」入口。

## 怎么用

1. 顶部切换标签页；「预设」页还可以再选预设类型。
2. 输入框按名字筛选，「全选」只选筛选出来的，另有「反选」「清空」。
3. 点一项右边的眼睛可以查看内容：
   - 主题：自定义 CSS 和其他设置
   - 世界书：每条条目的关键词和内容
   - 预设：聊天补全预设列出所有提示词；其他类型列出主要文本字段；都附完整 JSON
   - 正则：查找、替换、作用范围、选项
   - 背景图：大图
   看完点「勾选待删」或「取消勾选」，或「返回」。
4. 点「删除所选」，确认弹窗按类别列出要删的名字，再点「删除」。

## 批量导入主题

1. 用户设置 → UI 主题，点导入按钮右边的「批量导入主题」按钮。
2. 一次选多个 `.json` 文件。
3. 弹窗先列出将要导入的和将要跳过的（已有同名主题、本批里重名、文件没有主题名、不是有效 JSON），确认后逐个导入。
4. 含 `@import` 外链的主题，酒馆会像平时一样逐个弹窗询问是否允许。

导入走的是酒馆自己的导入逻辑，所以导入完可以直接在下拉框里切换，不用刷新页面。

## 各类数据是怎么删的

- 主题、世界书、预设、背景图：调酒馆自己的接口删文件，并同步更新页面上的下拉框和列表。删掉当前正在用的那个时，自动切到剩下的第一个。
- 正则：交给酒馆自带的正则扩展的批量删除功能处理，它会再弹一次确认。这样它内部的列表和当前聊天会被正确刷新。如果那个按钮不存在（旧版酒馆），就直接从设置里移除，并提示刷新页面。

## 已知限制

- 酒馆在内存里保存了一份主题列表，这个列表不对外开放，删除后不会同步。影响只有一条：**删掉某个主题后，如果想重新导入一个同名主题，要先刷新页面**。
- 预设类型里只列出当前酒馆页面上有选择框的类型。
- 背景图只处理系统背景（背景图面板的第一个标签页），聊天内的背景不处理。

---

## English

Adds a batch delete dialog to SillyTavern for UI themes, World Info books, presets (chat/text completion, KoboldAI, NovelAI, instruct, context, system prompt, reasoning), regex scripts (global, preset, scoped) and system backgrounds. Every item has a preview button so you can look at its contents before ticking it for deletion. Selections accumulate across tabs and are deleted in one go after a confirmation that lists everything by category.

Also adds batch import for UI themes: a button next to the theme import button accepts several JSON files at once, lists what will be imported or skipped (duplicates, missing name, invalid JSON) and then runs SillyTavern's own import for each file, so the new themes can be applied right away.

Install from the Extensions panel with the URL above. Tested on SillyTavern 1.19.0.

Regex scripts are handed to the built-in Regex extension's bulk delete, which asks for one more confirmation; this keeps its internal list and the current chat in sync. Reload the page before re-importing a theme with the same name as one you just deleted.
