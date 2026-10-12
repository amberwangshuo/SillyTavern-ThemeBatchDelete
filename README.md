# SillyTavern 主题批量删除（Theme Batch Delete）

酒馆（SillyTavern）自带的「UI 主题」删除按钮一次只能删当前选中的一个主题。这个扩展在它旁边加一个扫帚按钮，点开后可以勾选多个主题一次删掉。

在 SillyTavern 1.19.0 上实测过。

## 安装

在酒馆里打开「扩展」面板，点「安装扩展」，粘贴这个仓库的地址：

```
https://github.com/amberwangshuo/SillyTavern-ThemeBatchDelete
```

装好后打开「用户设置」，「UI 主题」的删除（垃圾桶）按钮右边会多一个扫帚按钮。

也可以手动安装：把本仓库整个文件夹放到酒馆的 `public/scripts/extensions/third-party/SillyTavern-ThemeBatchDelete/`，然后刷新页面。

## 功能

- 列出全部主题，带复选框；当前正在用的主题标有「当前」。
- 输入框按名字筛选（不区分大小写），「全选」只选筛选出来的那些，另有「反选」「清空」。
- 点「删除所选」后再弹一次确认，列出将要删除的名字。
- 删除走酒馆自己的 `/api/themes/delete` 接口，主题文件从服务器上删掉。
- 如果删掉的是当前主题，自动切到剩下的第一个主题并保存设置。
- 界面语言跟随酒馆的语言设置：中文显示中文，其他语言显示英文。
- 在「扩展」面板里也有一个入口。

## 已知限制

- 酒馆在内存里也保存了一份主题列表，这个列表不对外开放，删除后它不会同步更新。影响只有一条：**删掉某个主题后，如果想重新导入一个同名主题，要先刷新页面**，否则酒馆会提示主题已存在。删除本身和切换主题不受影响。
- 如果装了别的扩展把主题下拉框换成了自定义列表，那个列表可能要刷新页面才会更新。

---

## English

The built-in "Delete a theme" button in SillyTavern only deletes the currently selected UI theme. This extension adds a broom button next to it that opens a dialog where you can tick several themes and delete them at once.

Install from the Extensions panel with the URL above. Tested on SillyTavern 1.19.0.

Known limitation: SillyTavern keeps a private in-memory list of themes that this extension cannot update, so reload the page before re-importing a theme with the same name as one you just deleted.
