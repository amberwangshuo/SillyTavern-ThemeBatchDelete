// 批量删除 / Batch Delete
// 给酒馆加一个批量删除工具：主题、世界书、预设、正则、背景图。
// 每一项都能先点开查看内容，再决定要不要勾选删除。

import { getRequestHeaders, saveSettingsDebounced } from '../../../../script.js';
import { power_user } from '../../../power-user.js';
import { callGenericPopup, POPUP_TYPE, POPUP_RESULT } from '../../../popup.js';

const MODULE_NAME = 'theme-batch-delete';

// 可选模块：缺了哪个，对应的标签页就不显示，不影响其他功能。
const mods = {
    worldInfo: null,   // ../../../world-info.js
    presets: null,     // ../../../preset-manager.js
    backgrounds: null, // ../../../backgrounds.js
    regexEngine: null, // ../../../extensions/regex/engine.js
    extensions: null,  // ../../../extensions.js
};

async function loadOptionalModules() {
    const load = async (key, path) => {
        try {
            mods[key] = await import(path);
        } catch (error) {
            console.warn(`[${MODULE_NAME}] Optional module not available: ${path}`, error);
        }
    };
    await Promise.all([
        load('worldInfo', '../../../world-info.js'),
        load('presets', '../../../preset-manager.js'),
        load('backgrounds', '../../../backgrounds.js'),
        load('regexEngine', '../../../extensions/regex/engine.js'),
        load('extensions', '../../../extensions.js'),
    ]);
}

const STRINGS = {
    zh: {
        openButton: '批量删除',
        title: '批量删除',
        tabs: { theme: '主题', world: '世界书', preset: '预设', regex: '正则', background: '背景图' },
        presetTypes: {
            openai: '聊天补全', textgenerationwebui: '文本补全', kobold: 'KoboldAI', novel: 'NovelAI',
            instruct: '指令模板', context: '上下文模板', sysprompt: '系统提示词', reasoning: '推理模板',
        },
        regexTypes: { global: '全局', preset: '预设内', scoped: '角色内' },
        search: '筛选名称…',
        selectVisible: '全选',
        invert: '反选',
        clear: '清空',
        count: (page, pageTotal, all) => `本页已选 ${page} / 共 ${pageTotal}　·　全部已选 ${all}`,
        current: '当前',
        disabled: '已停用',
        view: '查看',
        empty: '没有匹配的项目',
        loading: '加载中…',
        loadFailed: '加载失败',
        okButton: '删除所选',
        cancelButton: '取消',
        back: '返回',
        markForDelete: '勾选待删',
        unmark: '取消勾选',
        nothingSelected: '还没有勾选任何项目。',
        confirmTitle: (n) => `确定删除这 ${n} 项吗？`,
        confirmNote: '文件会从服务器上删除，无法恢复。',
        confirmRegexNote: '正则脚本会交给酒馆的正则扩展删除，它会再弹一次确认。',
        confirmOk: '删除',
        more: (n) => `…还有 ${n} 项`,
        deleting: (done, total) => `正在删除 ${done} / ${total}`,
        doneAll: (n) => `已删除 ${n} 项。`,
        donePartial: (ok, fail) => `已删除 ${ok} 项，${fail} 项失败（详见控制台）。`,
        regexHanded: (n) => `${n} 条正则已交给正则扩展，请在它的弹窗里确认。`,
        regexFallback: '正则扩展的批量删除按钮不可用，已直接从设置中移除，请刷新页面。',
        reloadHint: '若要重新导入同名主题，请刷新页面。',
        settingsDesc: '在主题、世界书、预设、正则、背景图的面板里各有一个扫帚按钮，也可以从这里打开。主题的导入按钮旁边还有一个批量导入按钮。',
        settingsOpen: '打开批量删除',
        // 批量导入主题
        importButton: '批量导入主题',
        importTitle: (n) => `批量导入 ${n} 个主题文件`,
        importWillImport: (n) => `将导入 ${n} 个：`,
        importWillSkip: (n) => `跳过 ${n} 个：`,
        importReasonInvalid: '不是有效的主题文件',
        importReasonNoName: '文件里没有主题名',
        importReasonExists: '已有同名主题',
        importReasonDupInBatch: '和本批里另一个文件同名',
        importAtImportNote: (n) => `其中 ${n} 个主题包含 @import 外链，酒馆会逐个弹窗询问是否允许。`,
        importOk: '导入',
        importNothing: '没有可导入的文件。',
        importing: (done, total) => `正在导入 ${done} / ${total}`,
        importDone: (ok) => `已导入 ${ok} 个主题。`,
        importDonePartial: (ok, fail) => `已导入 ${ok} 个，${fail} 个失败（详见控制台）。`,
        importNoInput: '找不到酒馆的主题导入控件，无法批量导入。',
        // 预览
        previewEntries: (n) => `共 ${n} 条条目`,
        previewKeys: '关键词',
        previewSecondary: '次要关键词',
        previewNoContent: '（无内容）',
        previewEntryDisabled: '停用',
        previewConstant: '常驻',
        previewCss: '自定义 CSS',
        previewNoCss: '（没有自定义 CSS）',
        previewFields: '主要字段',
        previewJson: '完整 JSON',
        previewPrompts: '提示词',
        previewFind: '查找',
        previewReplace: '替换',
        previewTrim: '修剪',
        previewPlacement: '作用于',
        previewFlags: '选项',
        previewOrder: '顺序',
        placement: { 1: '用户输入', 2: 'AI 输出', 3: '斜杠命令', 5: '世界书', 6: '推理' },
        flagMarkdown: '仅显示', flagPrompt: '仅提示词', flagEdit: '编辑时运行',
        previewOther: '其他字段',
    },
    en: {
        openButton: 'Batch delete',
        title: 'Batch delete',
        tabs: { theme: 'Themes', world: 'World Info', preset: 'Presets', regex: 'Regex', background: 'Backgrounds' },
        presetTypes: {
            openai: 'Chat Completion', textgenerationwebui: 'Text Completion', kobold: 'KoboldAI', novel: 'NovelAI',
            instruct: 'Instruct', context: 'Context', sysprompt: 'System Prompt', reasoning: 'Reasoning',
        },
        regexTypes: { global: 'Global', preset: 'Preset', scoped: 'Scoped' },
        search: 'Filter by name…',
        selectVisible: 'Select all',
        invert: 'Invert',
        clear: 'Clear',
        count: (page, pageTotal, all) => `This tab: ${page} / ${pageTotal} selected · All tabs: ${all}`,
        current: 'current',
        disabled: 'disabled',
        view: 'View',
        empty: 'No matching items',
        loading: 'Loading…',
        loadFailed: 'Failed to load',
        okButton: 'Delete selected',
        cancelButton: 'Cancel',
        back: 'Back',
        markForDelete: 'Mark for deletion',
        unmark: 'Unmark',
        nothingSelected: 'Nothing selected.',
        confirmTitle: (n) => `Delete these ${n} items?`,
        confirmNote: 'Files will be removed from the server. This cannot be undone.',
        confirmRegexNote: 'Regex scripts are handed to the Regex extension, which asks for one more confirmation.',
        confirmOk: 'Delete',
        more: (n) => `…and ${n} more`,
        deleting: (done, total) => `Deleting ${done} / ${total}`,
        doneAll: (n) => `Deleted ${n} items.`,
        donePartial: (ok, fail) => `Deleted ${ok}, ${fail} failed (see console).`,
        regexHanded: (n) => `${n} regex scripts handed to the Regex extension; confirm in its popup.`,
        regexFallback: 'Regex bulk delete button unavailable; removed from settings directly. Reload the page.',
        reloadHint: 'Reload the page before re-importing a theme with the same name.',
        settingsDesc: 'A broom button sits in the theme, world info, preset, regex and background panels. You can also open it here. A batch import button sits next to the theme import button.',
        settingsOpen: 'Open batch delete',
        importButton: 'Batch import themes',
        importTitle: (n) => `Batch import ${n} theme files`,
        importWillImport: (n) => `Will import ${n}:`,
        importWillSkip: (n) => `Skipping ${n}:`,
        importReasonInvalid: 'not a valid theme file',
        importReasonNoName: 'no theme name in file',
        importReasonExists: 'a theme with this name already exists',
        importReasonDupInBatch: 'same name as another file in this batch',
        importAtImportNote: (n) => `${n} of them contain @import URLs; SillyTavern will ask about each one.`,
        importOk: 'Import',
        importNothing: 'Nothing to import.',
        importing: (done, total) => `Importing ${done} / ${total}`,
        importDone: (ok) => `Imported ${ok} themes.`,
        importDonePartial: (ok, fail) => `Imported ${ok}, ${fail} failed (see console).`,
        importNoInput: 'SillyTavern theme import control not found; cannot batch import.',
        previewEntries: (n) => `${n} entries`,
        previewKeys: 'Keys',
        previewSecondary: 'Secondary keys',
        previewNoContent: '(no content)',
        previewEntryDisabled: 'disabled',
        previewConstant: 'constant',
        previewCss: 'Custom CSS',
        previewNoCss: '(no custom CSS)',
        previewFields: 'Main fields',
        previewJson: 'Full JSON',
        previewPrompts: 'Prompts',
        previewFind: 'Find',
        previewReplace: 'Replace',
        previewTrim: 'Trim',
        previewPlacement: 'Affects',
        previewFlags: 'Options',
        previewOrder: 'Order',
        placement: { 1: 'User input', 2: 'AI output', 3: 'Slash commands', 5: 'World Info', 6: 'Reasoning' },
        flagMarkdown: 'Markdown only', flagPrompt: 'Prompt only', flagEdit: 'Run on edit',
        previewOther: 'Other fields',
    },
};

function getStrings() {
    let lang = '';
    try {
        lang = localStorage.getItem('language') || navigator.language || '';
    } catch {
        lang = navigator.language || '';
    }
    return String(lang).toLowerCase().startsWith('zh') ? STRINGS.zh : STRINGS.en;
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function preBlock(text, className = '') {
    const pre = el('pre', `tbd-pre ${className}`.trim());
    pre.textContent = text;
    return pre;
}

function detailsBlock(summaryText, contentNode, open = false) {
    const details = el('details', 'tbd-details');
    details.open = open;
    details.append(el('summary', '', summaryText), contentNode);
    return details;
}

/** 条目数不超过这个值时，预览里默认展开 */
const OPEN_BY_DEFAULT_LIMIT = 40;

const PRESET_API_IDS = ['openai', 'textgenerationwebui', 'kobold', 'novel', 'instruct', 'context', 'sysprompt', 'reasoning'];

// ---------- 各类数据的提供者 ----------
// 每个提供者：available()、list(opts) → [{id, name, badge?, thumb?, group?}]、preview(item) → HTMLElement、remove(items) → {deleted, failed}

const providers = {};

providers.theme = {
    available: () => document.getElementById('themes') !== null,
    list() {
        return Array.from(document.querySelectorAll('#themes option'))
            .map(o => o.value).filter(Boolean)
            .map(name => ({ id: name, name, badge: name === power_user.theme ? 'current' : null }));
    },
    _settingsCache: null,
    async preview(item, t) {
        if (!this._settingsCache) {
            const response = await fetch('/api/settings/get', { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({}) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this._settingsCache = await response.json();
        }
        const theme = (this._settingsCache.themes || []).find(x => x.name === item.name);
        const root = el('div', 'tbd-preview');
        if (!theme) {
            root.append(el('div', 'tbd-muted', t.loadFailed));
            return root;
        }
        const css = typeof theme.custom_css === 'string' ? theme.custom_css : '';
        root.append(el('h4', '', t.previewCss));
        root.append(css.trim() ? preBlock(css) : el('div', 'tbd-muted', t.previewNoCss));
        const rest = { ...theme };
        delete rest.custom_css;
        root.append(detailsBlock(t.previewJson, preBlock(JSON.stringify(rest, null, 2))));
        return root;
    },
    async remove(items, t) {
        const deleted = [], failed = [];
        for (const item of items) {
            try {
                const response = await fetch('/api/themes/delete', { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({ name: item.name }) });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                document.querySelectorAll('#themes option').forEach(o => { if (o.value === item.name) o.remove(); });
                deleted.push(item);
            } catch (error) {
                console.error(`[${MODULE_NAME}] theme delete failed: ${item.name}`, error);
                failed.push(item);
            }
        }
        if (deleted.some(x => x.name === power_user.theme)) {
            const remaining = Array.from(document.querySelectorAll('#themes option')).map(o => o.value).filter(Boolean);
            if (remaining.length) {
                $('#themes').val(remaining[0]).trigger('change');
            } else {
                power_user.theme = undefined;
                saveSettingsDebounced();
            }
        }
        if (deleted.length) toastr.info(t.reloadHint, '', { timeOut: 8000 });
        this._settingsCache = null;
        return { deleted, failed };
    },
};

providers.world = {
    available: () => !!mods.worldInfo && Array.isArray(mods.worldInfo.world_names),
    list() {
        const selected = Array.isArray(mods.worldInfo.selected_world_info) ? mods.worldInfo.selected_world_info : [];
        const charWorld = $('#character_world').val();
        return mods.worldInfo.world_names.map(name => ({
            id: name, name,
            badge: selected.includes(name) || charWorld === name ? 'current' : null,
        }));
    },
    async preview(item, t) {
        const data = await mods.worldInfo.loadWorldInfo(item.name);
        const root = el('div', 'tbd-preview');
        if (!data || !data.entries) {
            root.append(el('div', 'tbd-muted', t.loadFailed));
            return root;
        }
        const entries = Object.values(data.entries);
        entries.sort((a, b) => (a.displayIndex ?? a.uid ?? 0) - (b.displayIndex ?? b.uid ?? 0));
        root.append(el('h4', '', t.previewEntries(entries.length)));
        const openByDefault = entries.length <= OPEN_BY_DEFAULT_LIMIT;
        for (const entry of entries) {
            const keys = Array.isArray(entry.key) ? entry.key : [];
            const secondary = Array.isArray(entry.keysecondary) ? entry.keysecondary : [];
            const title = entry.comment || keys.join(', ') || `#${entry.uid}`;
            const body = el('div', 'tbd-entry-body');
            const meta = el('div', 'tbd-entry-meta');
            if (keys.length) meta.append(el('span', '', `${t.previewKeys}: ${keys.join(', ')}`));
            if (secondary.length) meta.append(el('span', '', `${t.previewSecondary}: ${secondary.join(', ')}`));
            if (entry.constant) meta.append(el('span', 'tbd-badge', t.previewConstant));
            if (entry.disable) meta.append(el('span', 'tbd-badge', t.previewEntryDisabled));
            body.append(meta);
            const content = String(entry.content || '').trim();
            body.append(content ? preBlock(content) : el('div', 'tbd-muted', t.previewNoContent));
            root.append(detailsBlock(title, body, openByDefault));
        }
        return root;
    },
    async remove(items) {
        const deleted = [], failed = [];
        for (const item of items) {
            try {
                const ok = await mods.worldInfo.deleteWorldInfo(item.name);
                (ok ? deleted : failed).push(item);
            } catch (error) {
                console.error(`[${MODULE_NAME}] world info delete failed: ${item.name}`, error);
                failed.push(item);
            }
        }
        return { deleted, failed };
    },
};

providers.preset = {
    available: () => !!mods.presets && typeof mods.presets.getPresetManager === 'function',
    apiIds() {
        return PRESET_API_IDS.filter(apiId => {
            try { return !!mods.presets.getPresetManager(apiId); } catch { return false; }
        });
    },
    manager(apiId) {
        return mods.presets.getPresetManager(apiId);
    },
    list({ apiId }) {
        const pm = this.manager(apiId);
        if (!pm) return [];
        const selectedName = pm.getSelectedPresetName();
        return pm.getAllPresets().filter(Boolean).map(name => ({
            id: `${apiId}::${name}`, name, apiId,
            badge: name === selectedName ? 'current' : null,
        }));
    },
    async preview(item, t) {
        const pm = this.manager(item.apiId);
        const preset = pm?.getCompletionPresetByName(item.name);
        const root = el('div', 'tbd-preview');
        if (!preset) {
            root.append(el('div', 'tbd-muted', t.loadFailed));
            return root;
        }
        // 聊天补全预设：列出提示词
        if (Array.isArray(preset.prompts)) {
            const enabledIds = new Set();
            const order = Array.isArray(preset.prompt_order) ? preset.prompt_order : [];
            const orderEntry = order.find(o => o.character_id === 100001) || order[order.length - 1];
            (orderEntry?.order || []).forEach(o => { if (o.enabled) enabledIds.add(o.identifier); });
            root.append(el('h4', '', `${t.previewPrompts} (${preset.prompts.length})`));
            const openByDefault = preset.prompts.length <= OPEN_BY_DEFAULT_LIMIT;
            for (const prompt of preset.prompts) {
                const name = prompt.name || prompt.identifier || '';
                const body = el('div', 'tbd-entry-body');
                const meta = el('div', 'tbd-entry-meta');
                if (prompt.role) meta.append(el('span', '', prompt.role));
                if (prompt.identifier) meta.append(el('span', 'tbd-muted', prompt.identifier));
                if (order.length && !enabledIds.has(prompt.identifier)) meta.append(el('span', 'tbd-badge', t.previewEntryDisabled));
                body.append(meta);
                const content = String(prompt.content || '').trim();
                body.append(content ? preBlock(content) : el('div', 'tbd-muted', t.previewNoContent));
                root.append(detailsBlock(name, body, openByDefault));
            }
        }
        // 主要文本字段
        const textFields = ['content', 'story_string', 'input_sequence', 'output_sequence', 'system_sequence', 'prefix', 'suffix',
            'chat_start', 'example_separator', 'impersonation_prompt', 'new_chat_prompt', 'continue_nudge_prompt', 'assistant_prefill'];
        const fields = el('div', 'tbd-fields');
        for (const key of textFields) {
            if (typeof preset[key] === 'string' && preset[key].trim()) {
                fields.append(el('div', 'tbd-field-name', key), preBlock(preset[key]));
            }
        }
        if (fields.childElementCount) {
            root.append(el('h4', '', t.previewFields), fields);
        }
        root.append(detailsBlock(t.previewJson, preBlock(JSON.stringify(preset, null, 2))));
        return root;
    },
    async remove(items) {
        const deleted = [], failed = [];
        for (const item of items) {
            try {
                const pm = this.manager(item.apiId);
                const ok = await pm.deletePreset(item.name);
                (ok ? deleted : failed).push(item);
            } catch (error) {
                console.error(`[${MODULE_NAME}] preset delete failed: ${item.apiId}/${item.name}`, error);
                failed.push(item);
            }
        }
        return { deleted, failed };
    },
};

providers.regex = {
    available: () => !!mods.regexEngine && typeof mods.regexEngine.getScriptsByType === 'function',
    types() {
        const T = mods.regexEngine.SCRIPT_TYPES;
        return [
            { key: 'global', type: T.GLOBAL },
            { key: 'preset', type: T.PRESET },
            { key: 'scoped', type: T.SCOPED },
        ];
    },
    list(_opts, t) {
        const items = [];
        for (const { key, type } of this.types()) {
            let scripts = [];
            try { scripts = mods.regexEngine.getScriptsByType(type, { allowedOnly: false }) || []; } catch { scripts = []; }
            for (const script of scripts) {
                if (!script || !script.id) continue;
                items.push({
                    id: `${key}::${script.id}`, name: script.scriptName || script.id, script, scriptType: type, typeKey: key,
                    group: t.regexTypes[key], badge: script.disabled ? 'disabled' : null,
                });
            }
        }
        return items;
    },
    async preview(item, t) {
        const s = item.script;
        const root = el('div', 'tbd-preview');
        const fields = el('div', 'tbd-fields');
        fields.append(el('div', 'tbd-field-name', t.previewFind), preBlock(String(s.findRegex ?? '')));
        fields.append(el('div', 'tbd-field-name', t.previewReplace), preBlock(String(s.replaceString ?? '')));
        if (Array.isArray(s.trimStrings) && s.trimStrings.length) {
            fields.append(el('div', 'tbd-field-name', t.previewTrim), preBlock(s.trimStrings.join('\n')));
        }
        const placement = (Array.isArray(s.placement) ? s.placement : []).map(p => t.placement[p] || String(p));
        fields.append(el('div', 'tbd-field-name', t.previewPlacement), el('div', '', placement.join(', ') || '-'));
        const flags = [];
        if (s.markdownOnly) flags.push(t.flagMarkdown);
        if (s.promptOnly) flags.push(t.flagPrompt);
        if (s.runOnEdit) flags.push(t.flagEdit);
        if (s.disabled) flags.push(t.disabled);
        fields.append(el('div', 'tbd-field-name', t.previewFlags), el('div', '', flags.join(', ') || '-'));
        root.append(fields);
        root.append(detailsBlock(t.previewJson, preBlock(JSON.stringify(s, null, 2))));
        return root;
    },
    // 优先走正则扩展自己的批量删除：它会刷新列表、重载聊天，并再弹一次确认。
    async remove(items, t) {
        const bulkButton = document.getElementById('bulk_delete_regex');
        const container = document.getElementById('regex_container');
        if (bulkButton && container) {
            const wanted = new Set(items.map(x => x.script.id));
            let matched = 0;
            container.querySelectorAll('.regex-script-label').forEach(label => {
                const box = label.querySelector('.regex_bulk_checkbox');
                if (!box) return;
                const hit = wanted.has(label.id);
                box.checked = hit;
                if (hit) matched++;
            });
            if (matched > 0) {
                bulkButton.click();
                toastr.info(t.regexHanded(matched), '', { timeOut: 8000 });
                return { deleted: [], failed: [], handed: items };
            }
        }
        // 兜底：直接改设置
        const byType = new Map();
        for (const item of items) {
            if (!byType.has(item.scriptType)) byType.set(item.scriptType, new Set());
            byType.get(item.scriptType).add(item.script.id);
        }
        for (const [type, ids] of byType) {
            const current = mods.regexEngine.getScriptsByType(type, { allowedOnly: false }) || [];
            const next = current.filter(s => !ids.has(s.id));
            await mods.regexEngine.saveScriptsByType(next, type);
            ids.forEach(id => document.querySelectorAll('#regex_container .regex-script-label').forEach(n => { if (n.id === id) n.remove(); }));
        }
        saveSettingsDebounced();
        toastr.warning(t.regexFallback, '', { timeOut: 10000 });
        return { deleted: items, failed: [] };
    },
};

providers.background = {
    available: () => !!mods.backgrounds && typeof mods.backgrounds.getBackgrounds === 'function',
    async list() {
        const response = await fetch('/api/backgrounds/all', { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({}) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const images = Array.isArray(data) ? data : (data.images || []);
        const currentName = mods.backgrounds.background_settings?.name;
        return images.map(img => {
            const filename = typeof img === 'string' ? img : img.filename;
            return {
                id: filename, name: filename,
                thumb: `/thumbnail?type=bg&file=${encodeURIComponent(filename)}`,
                badge: filename === currentName ? 'current' : null,
            };
        });
    },
    async preview(item) {
        const root = el('div', 'tbd-preview tbd-preview-image');
        const img = el('img', 'tbd-full-image');
        img.src = `backgrounds/${encodeURIComponent(item.name)}`;
        img.alt = item.name;
        root.append(img);
        return root;
    },
    async remove(items) {
        const deleted = [], failed = [];
        for (const item of items) {
            try {
                const response = await fetch('/api/backgrounds/delete', { method: 'POST', headers: getRequestHeaders(), body: JSON.stringify({ bg: item.name }) });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                deleted.push(item);
            } catch (error) {
                console.error(`[${MODULE_NAME}] background delete failed: ${item.name}`, error);
                failed.push(item);
            }
        }
        if (deleted.length) {
            const currentName = mods.backgrounds.background_settings?.name;
            try { await mods.backgrounds.getBackgrounds(); } catch (error) { console.warn(`[${MODULE_NAME}] getBackgrounds failed`, error); }
            if (deleted.some(x => x.name === currentName)) {
                const next = document.querySelector('#bg_menu_content .bg_example');
                if (next) next.click();
            }
        }
        return { deleted, failed };
    },
};

const TAB_ORDER = ['theme', 'world', 'preset', 'regex', 'background'];

// ---------- 主弹窗 ----------

async function openBatchDeleteDialog({ tab = 'theme', presetApiId = null } = {}) {
    const t = getStrings();
    const tabs = TAB_ORDER.filter(key => { try { return providers[key].available(); } catch { return false; } });
    if (!tabs.length) {
        toastr.error(t.loadFailed);
        return;
    }
    let activeTab = tabs.includes(tab) ? tab : tabs[0];
    let activePresetApi = presetApiId;

    /** @type {Map<string, {item: object, tab: string}>} 全部标签页的已选项，键为 `${tab}::${item.id}` */
    const selected = new Map();
    const selKey = (tabKey, item) => `${tabKey}::${item.id}`;

    const root = el('div', 'tbd-root');
    root.innerHTML = `
        <h3 class="margin0">${escapeHtml(t.title)}</h3>
        <div class="tbd-tabs"></div>
        <div class="tbd-sub"></div>
        <div class="tbd-toolbar">
            <input type="text" class="text_pole tbd-search" placeholder="${escapeHtml(t.search)}">
            <div class="menu_button tbd-select-visible">${escapeHtml(t.selectVisible)}</div>
            <div class="menu_button tbd-invert">${escapeHtml(t.invert)}</div>
            <div class="menu_button tbd-clear">${escapeHtml(t.clear)}</div>
        </div>
        <div class="tbd-count"></div>
        <div class="tbd-list"></div>
    `;
    const tabBar = root.querySelector('.tbd-tabs');
    const sub = root.querySelector('.tbd-sub');
    const list = root.querySelector('.tbd-list');
    const search = root.querySelector('.tbd-search');
    const count = root.querySelector('.tbd-count');

    /** 当前标签页渲染出来的条目 */
    let items = [];
    let renderToken = 0;

    for (const key of tabs) {
        const btn = el('div', 'menu_button tbd-tab', t.tabs[key]);
        btn.dataset.tab = key;
        btn.addEventListener('click', () => { if (activeTab !== key) { activeTab = key; renderTab(); } });
        tabBar.append(btn);
    }

    function visibleItems() {
        return items.filter(x => x.label.style.display !== 'none');
    }

    function updateCount() {
        const page = items.filter(x => selected.has(selKey(activeTab, x.item))).length;
        count.textContent = t.count(page, items.length, selected.size);
    }

    function applyFilter() {
        const query = search.value.trim().toLowerCase();
        let shown = 0;
        let lastGroup = null;
        for (const entry of items) {
            const match = !query || entry.item.name.toLowerCase().includes(query) || (entry.item.group || '').toLowerCase().includes(query);
            entry.label.style.display = match ? '' : 'none';
            if (entry.groupHeader) {
                entry.groupHeader.style.display = 'none';
            }
            if (match) {
                shown++;
                if (entry.groupHeader && entry.item.group !== lastGroup) {
                    entry.groupHeader.style.display = '';
                }
                lastGroup = entry.item.group;
            }
        }
        // 组标题：只要组里有可见项就显示
        const groups = new Map();
        for (const entry of items) {
            if (!entry.groupHeader) continue;
            groups.set(entry.item.group, entry.groupHeader);
        }
        for (const [group, header] of groups) {
            header.style.display = items.some(x => x.item.group === group && x.label.style.display !== 'none') ? '' : 'none';
        }
        list.querySelector('.tbd-empty').style.display = shown === 0 ? '' : 'none';
        updateCount();
    }

    function setChecked(entry, checked) {
        const key = selKey(activeTab, entry.item);
        if (checked) selected.set(key, { item: entry.item, tab: activeTab }); else selected.delete(key);
        entry.checkbox.checked = checked;
        entry.label.classList.toggle('tbd-checked', checked);
        updateCount();
    }

    async function openPreview(entry) {
        const provider = providers[activeTab];
        let content;
        try {
            content = await provider.preview(entry.item, t);
        } catch (error) {
            console.error(`[${MODULE_NAME}] preview failed`, error);
            content = el('div', 'tbd-muted', t.loadFailed);
        }
        const wrapper = el('div', 'tbd-preview-root');
        const header = el('div', 'tbd-preview-header');
        header.append(el('h3', 'margin0', entry.item.name));
        if (entry.item.group) header.append(el('span', 'tbd-badge', entry.item.group));
        wrapper.append(header, content);
        const isChecked = selected.has(selKey(activeTab, entry.item));
        const result = await callGenericPopup(wrapper, POPUP_TYPE.TEXT, '', {
            okButton: isChecked ? t.unmark : t.markForDelete,
            cancelButton: t.back,
            wide: true,
            large: true,
            allowVerticalScrolling: true,
        });
        if (result === POPUP_RESULT.AFFIRMATIVE) {
            setChecked(entry, !isChecked);
        }
    }

    function buildSub() {
        sub.innerHTML = '';
        if (activeTab !== 'preset') return;
        const apiIds = providers.preset.apiIds();
        if (!apiIds.length) return;
        if (!activePresetApi || !apiIds.includes(activePresetApi)) activePresetApi = apiIds[0];
        const select = el('select', 'text_pole tbd-preset-type');
        for (const apiId of apiIds) {
            const option = el('option', '', t.presetTypes[apiId] || apiId);
            option.value = apiId;
            option.selected = apiId === activePresetApi;
            select.append(option);
        }
        select.addEventListener('change', () => { activePresetApi = select.value; renderTab(); });
        sub.append(select);
    }

    async function renderTab() {
        const token = ++renderToken;
        tabBar.querySelectorAll('.tbd-tab').forEach(b => b.classList.toggle('tbd-tab-active', b.dataset.tab === activeTab));
        buildSub();
        list.innerHTML = '';
        items = [];
        list.append(el('div', 'tbd-muted tbd-loading', t.loading));
        let data = [];
        try {
            data = await providers[activeTab].list({ apiId: activePresetApi }, t);
        } catch (error) {
            console.error(`[${MODULE_NAME}] list failed for ${activeTab}`, error);
            list.innerHTML = '';
            list.append(el('div', 'tbd-muted', t.loadFailed));
            return;
        }
        if (token !== renderToken) return;
        list.innerHTML = '';
        let lastGroup = null;
        for (const item of data) {
            let groupHeader = null;
            if (item.group && item.group !== lastGroup) {
                groupHeader = el('div', 'tbd-group', item.group);
                list.append(groupHeader);
                lastGroup = item.group;
            }
            const label = el('label', 'tbd-item');
            const checkbox = el('input');
            checkbox.type = 'checkbox';
            checkbox.value = item.id;
            label.append(checkbox);
            if (item.thumb) {
                const img = el('img', 'tbd-thumb');
                img.loading = 'lazy';
                img.src = item.thumb;
                img.alt = '';
                label.append(img);
            }
            const name = el('span', 'tbd-name', item.name);
            name.title = item.name;
            label.append(name);
            if (item.badge) label.append(el('span', 'tbd-badge', t[item.badge] || item.badge));
            const viewButton = el('div', 'menu_button menu_button_icon tbd-view');
            viewButton.title = t.view;
            viewButton.innerHTML = '<i class="fa-solid fa-eye"></i>';
            label.append(viewButton);
            const entry = { item, label, checkbox, groupHeader };
            const isChecked = selected.has(selKey(activeTab, item));
            checkbox.checked = isChecked;
            label.classList.toggle('tbd-checked', isChecked);
            checkbox.addEventListener('change', () => setChecked(entry, checkbox.checked));
            viewButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                openPreview(entry);
            });
            list.append(label);
            items.push(entry);
        }
        const empty = el('div', 'tbd-empty', t.empty);
        empty.style.display = 'none';
        list.append(empty);
        applyFilter();
    }

    search.addEventListener('input', applyFilter);
    root.querySelector('.tbd-select-visible').addEventListener('click', () => visibleItems().forEach(e => setChecked(e, true)));
    root.querySelector('.tbd-invert').addEventListener('click', () => visibleItems().forEach(e => setChecked(e, !e.checkbox.checked)));
    root.querySelector('.tbd-clear').addEventListener('click', () => {
        selected.clear();
        items.forEach(e => { e.checkbox.checked = false; e.label.classList.remove('tbd-checked'); });
        updateCount();
    });

    renderTab();

    const result = await callGenericPopup(root, POPUP_TYPE.CONFIRM, '', {
        okButton: t.okButton,
        cancelButton: t.cancelButton,
        wide: true,
        large: true,
        allowVerticalScrolling: true,
        onClosing: (popup) => {
            if (popup.result === POPUP_RESULT.AFFIRMATIVE && selected.size === 0) {
                toastr.warning(t.nothingSelected);
                return false;
            }
            return true;
        },
    });

    if (result !== POPUP_RESULT.AFFIRMATIVE || selected.size === 0) {
        return;
    }

    // 按标签页分组
    const byTab = new Map();
    for (const { item, tab: tabKey } of selected.values()) {
        if (!byTab.has(tabKey)) byTab.set(tabKey, []);
        byTab.get(tabKey).push(item);
    }
    if (!(await confirmDeletion(byTab, t))) {
        return;
    }
    await runDeletion(byTab, t);
}

async function confirmDeletion(byTab, t) {
    const MAX_SHOWN = 40;
    let total = 0;
    const parts = [];
    for (const key of TAB_ORDER) {
        const items = byTab.get(key);
        if (!items?.length) continue;
        total += items.length;
        const shown = items.slice(0, MAX_SHOWN).map(x => `<li>${escapeHtml(x.group ? `[${x.group}] ${x.name}` : (x.apiId ? `[${escapeHtml(t.presetTypes[x.apiId] || x.apiId)}] ${x.name}` : x.name))}</li>`).join('');
        const more = items.length > MAX_SHOWN ? `<li class="tbd-muted">${escapeHtml(t.more(items.length - MAX_SHOWN))}</li>` : '';
        parts.push(`<div class="tbd-confirm-group"><b>${escapeHtml(t.tabs[key])} (${items.length})</b><ul class="tbd-confirm-list">${shown}${more}</ul></div>`);
    }
    const regexNote = byTab.has('regex') ? `<div class="tbd-muted">${escapeHtml(t.confirmRegexNote)}</div>` : '';
    const html = `
        <h3>${escapeHtml(t.confirmTitle(total))}</h3>
        <div>${escapeHtml(t.confirmNote)}</div>
        ${regexNote}
        <div class="tbd-confirm-groups">${parts.join('')}</div>
    `;
    const result = await callGenericPopup(html, POPUP_TYPE.CONFIRM, '', {
        okButton: t.confirmOk,
        cancelButton: t.cancelButton,
        allowVerticalScrolling: true,
    });
    return result === POPUP_RESULT.AFFIRMATIVE;
}

async function runDeletion(byTab, t) {
    const total = Array.from(byTab.values()).reduce((n, arr) => n + arr.length, 0);
    const progress = toastr.info(t.deleting(0, total), '', { timeOut: 0, extendedTimeOut: 0, tapToDismiss: false });
    let deleted = 0, failed = 0, handed = 0;
    // 正则放最后：它会交给正则扩展弹窗确认
    const order = TAB_ORDER.filter(k => k !== 'regex').concat(['regex']);
    for (const key of order) {
        const items = byTab.get(key);
        if (!items?.length) continue;
        try {
            const result = await providers[key].remove(items, t);
            deleted += result.deleted.length;
            failed += result.failed.length;
            handed += result.handed?.length || 0;
        } catch (error) {
            console.error(`[${MODULE_NAME}] remove failed for ${key}`, error);
            failed += items.length;
        }
        if (progress) progress.find('.toast-message').text(t.deleting(deleted + failed + handed, total));
    }
    if (progress) toastr.clear(progress);
    if (deleted > 0 || failed > 0) {
        if (failed === 0) toastr.success(t.doneAll(deleted), '', { timeOut: 6000 });
        else toastr.warning(t.donePartial(deleted, failed), '', { timeOut: 10000 });
    }
    document.dispatchEvent(new CustomEvent('batchDeleteDone', { detail: { deleted, failed, handed } }));
}

// ---------- 批量导入主题 ----------
// 做法：逐个把文件塞进酒馆自己的导入控件并触发 change，让酒馆走它自己的 importTheme。
// 这样酒馆内存里的主题列表也会更新，导入后能直接切换，不用刷新页面。

function readFileText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function themeExists(name) {
    return Array.from(document.querySelectorAll('#themes option')).some(o => o.value === name);
}

/** 把一个文件交给酒馆的导入控件，等它处理完（成功或失败）。 */
async function importOneThemeViaSillyTavern(input, file, name) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    // 酒馆处理完会把 input.value 清空（files 变为空）。含 @import 的主题会弹窗等用户，所以上限放宽。
    const deadline = Date.now() + 10 * 60 * 1000;
    while (input.files && input.files.length > 0 && Date.now() < deadline) {
        await sleep(100);
    }
    await sleep(50);
    return themeExists(name);
}

async function batchImportThemes(files) {
    const t = getStrings();
    const input = document.getElementById('ui_preset_import_file');
    if (!(input instanceof HTMLInputElement)) {
        toastr.error(t.importNoInput);
        return;
    }
    const plan = [];
    const seen = new Set();
    for (const file of files) {
        let name = null;
        let reason = null;
        let hasAtImport = false;
        try {
            const parsed = JSON.parse(await readFileText(file));
            if (!parsed || typeof parsed !== 'object') {
                reason = t.importReasonInvalid;
            } else if (!parsed.name || typeof parsed.name !== 'string') {
                reason = t.importReasonNoName;
            } else {
                name = parsed.name;
                hasAtImport = typeof parsed.custom_css === 'string' && parsed.custom_css.includes('@import');
                if (themeExists(name)) reason = t.importReasonExists;
                else if (seen.has(name)) reason = t.importReasonDupInBatch;
                else seen.add(name);
            }
        } catch {
            reason = t.importReasonInvalid;
        }
        plan.push({ file, name, reason, hasAtImport });
    }
    const toImport = plan.filter(x => !x.reason);
    const toSkip = plan.filter(x => x.reason);
    if (!toImport.length) {
        toastr.warning(t.importNothing);
        if (toSkip.length) console.warn(`[${MODULE_NAME}] batch import: all skipped`, toSkip.map(x => `${x.file.name}: ${x.reason}`));
        return;
    }
    const atImportCount = toImport.filter(x => x.hasAtImport).length;
    const html = `
        <h3>${escapeHtml(t.importTitle(plan.length))}</h3>
        <div class="tbd-confirm-groups">
            <div class="tbd-confirm-group"><b>${escapeHtml(t.importWillImport(toImport.length))}</b>
                <ul class="tbd-confirm-list">${toImport.map(x => `<li>${escapeHtml(x.name)}</li>`).join('')}</ul></div>
            ${toSkip.length ? `<div class="tbd-confirm-group"><b>${escapeHtml(t.importWillSkip(toSkip.length))}</b>
                <ul class="tbd-confirm-list">${toSkip.map(x => `<li>${escapeHtml(x.file.name)} <span class="tbd-muted">(${escapeHtml(x.reason)})</span></li>`).join('')}</ul></div>` : ''}
        </div>
        ${atImportCount ? `<div class="tbd-muted">${escapeHtml(t.importAtImportNote(atImportCount))}</div>` : ''}
    `;
    const result = await callGenericPopup(html, POPUP_TYPE.CONFIRM, '', {
        okButton: t.importOk,
        cancelButton: t.cancelButton,
        allowVerticalScrolling: true,
    });
    if (result !== POPUP_RESULT.AFFIRMATIVE) {
        return;
    }
    const progress = toastr.info(t.importing(0, toImport.length), '', { timeOut: 0, extendedTimeOut: 0, tapToDismiss: false });
    let ok = 0, fail = 0;
    for (let i = 0; i < toImport.length; i++) {
        const { file, name } = toImport[i];
        try {
            const imported = await importOneThemeViaSillyTavern(input, file, name);
            if (imported) ok++; else { fail++; console.error(`[${MODULE_NAME}] theme import failed: ${file.name}`); }
        } catch (error) {
            fail++;
            console.error(`[${MODULE_NAME}] theme import failed: ${file.name}`, error);
        }
        if (progress) progress.find('.toast-message').text(t.importing(i + 1, toImport.length));
    }
    if (progress) toastr.clear(progress);
    if (fail === 0) toastr.success(t.importDone(ok), '', { timeOut: 6000 });
    else toastr.warning(t.importDonePartial(ok, fail), '', { timeOut: 10000 });
}

function addImportButton() {
    const t = getStrings();
    const anchor = document.getElementById('ui_preset_import_button');
    if (!anchor || document.getElementById('tbd-import-button')) {
        return;
    }
    const input = el('input');
    input.type = 'file';
    input.id = 'tbd-import-input';
    input.accept = '.json';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', async () => {
        const files = Array.from(input.files || []);
        input.value = '';
        if (files.length) await batchImportThemes(files);
    });
    const button = el('div', 'menu_button menu_button_icon margin0 tbd-entry');
    button.id = 'tbd-import-button';
    button.title = t.importButton;
    button.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.click();
    });
    anchor.insertAdjacentElement('afterend', button);
    button.insertAdjacentElement('afterend', input);
}

// ---------- 入口按钮 ----------

function makeEntryButton(t, options) {
    const button = el('div', 'menu_button menu_button_icon margin0 tbd-entry');
    button.title = t.openButton;
    button.innerHTML = '<i class="fa-solid fa-broom"></i>';
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openBatchDeleteDialog(options);
    });
    return button;
}

function insertAfter(anchor, node) {
    if (!anchor || anchor.nextElementSibling?.classList?.contains('tbd-entry')) return false;
    anchor.insertAdjacentElement('afterend', node);
    return true;
}

function addEntryButtons() {
    const t = getStrings();
    // 主题
    const themeAnchor = document.getElementById('ui-preset-delete-button') || document.getElementById('ui_preset_delete_button');
    if (themeAnchor) {
        const button = makeEntryButton(t, { tab: 'theme' });
        button.id = 'tbd-open-button';
        insertAfter(themeAnchor, button);
    }
    // 世界书
    insertAfter(document.getElementById('world_popup_delete'), makeEntryButton(t, { tab: 'world' }));
    // 预设：每个预设类型的删除按钮旁边
    document.querySelectorAll('[data-preset-manager-delete]').forEach(node => {
        const apiId = node.getAttribute('data-preset-manager-delete');
        insertAfter(node, makeEntryButton(t, { tab: 'preset', presetApiId: apiId }));
    });
    insertAfter(document.getElementById('delete_oai_preset'), makeEntryButton(t, { tab: 'preset', presetApiId: 'openai' }));
    // 背景图
    insertAfter(document.getElementById('add_background_button_top'), makeEntryButton(t, { tab: 'background' }));
    // 正则：面板是正则扩展动态生成的，等它出现
    let tries = 0;
    const timer = setInterval(() => {
        const anchor = document.getElementById('open_regex_debugger') || document.getElementById('import_regex');
        if (anchor) {
            insertAfter(anchor, makeEntryButton(t, { tab: 'regex' }));
            clearInterval(timer);
        } else if (++tries > 40) {
            clearInterval(timer);
        }
    }, 500);
}

function addSettingsPanel() {
    const t = getStrings();
    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container || document.getElementById('tbd-settings')) {
        return;
    }
    const panel = el('div', 'tbd-settings');
    panel.id = 'tbd-settings';
    panel.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>${escapeHtml(t.title)}</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="tbd-settings-row">
                    <div class="menu_button tbd-settings-open"><i class="fa-solid fa-broom"></i> ${escapeHtml(t.settingsOpen)}</div>
                </div>
                <small>${escapeHtml(t.settingsDesc)}</small>
            </div>
        </div>
    `;
    panel.querySelector('.tbd-settings-open').addEventListener('click', () => openBatchDeleteDialog());
    container.append(panel);
}

jQuery(async () => {
    await loadOptionalModules();
    addEntryButtons();
    addImportButton();
    addSettingsPanel();
});

export { batchImportThemes };

export { openBatchDeleteDialog };
