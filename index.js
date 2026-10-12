// 主题批量删除 / Theme Batch Delete
// 给酒馆的「UI 主题」加一个批量删除按钮：勾选多个主题一次删掉。

import { getRequestHeaders, saveSettingsDebounced } from '../../../../script.js';
import { power_user } from '../../../power-user.js';
import { callGenericPopup, POPUP_TYPE, POPUP_RESULT } from '../../../popup.js';

const MODULE_NAME = 'theme-batch-delete';

const STRINGS = {
    zh: {
        openButton: '批量删除主题',
        title: '批量删除主题',
        search: '筛选主题名…',
        selectVisible: '全选',
        invert: '反选',
        clear: '清空',
        count: (sel, total, visible) => `已选 ${sel} / 共 ${total}` + (visible !== total ? `（筛选出 ${visible}）` : ''),
        current: '当前',
        empty: '没有匹配的主题',
        noThemes: '还没有任何主题。',
        okButton: '删除所选',
        cancelButton: '取消',
        nothingSelected: '还没有勾选任何主题。',
        confirmTitle: (n) => `确定删除这 ${n} 个主题吗？`,
        confirmNote: '主题文件会从服务器上删除，无法恢复。',
        confirmOk: '删除',
        more: (n) => `…还有 ${n} 个`,
        deleting: (done, total) => `正在删除 ${done} / ${total}`,
        doneAll: (n) => `已删除 ${n} 个主题。`,
        donePartial: (ok, fail) => `已删除 ${ok} 个，${fail} 个失败（详见控制台）。`,
        reloadHint: '若要重新导入同名主题，请刷新页面。',
        settingsDesc: '在「用户设置 → UI 主题」的删除按钮旁边多了一个批量删除按钮，也可以从这里打开。',
        settingsOpen: '打开批量删除',
    },
    en: {
        openButton: 'Batch delete themes',
        title: 'Batch delete themes',
        search: 'Filter by name…',
        selectVisible: 'Select all',
        invert: 'Invert',
        clear: 'Clear',
        count: (sel, total, visible) => `${sel} selected / ${total} total` + (visible !== total ? ` (${visible} shown)` : ''),
        current: 'current',
        empty: 'No matching themes',
        noThemes: 'There are no themes yet.',
        okButton: 'Delete selected',
        cancelButton: 'Cancel',
        nothingSelected: 'No themes selected.',
        confirmTitle: (n) => `Delete these ${n} themes?`,
        confirmNote: 'The theme files will be removed from the server. This cannot be undone.',
        confirmOk: 'Delete',
        more: (n) => `…and ${n} more`,
        deleting: (done, total) => `Deleting ${done} / ${total}`,
        doneAll: (n) => `Deleted ${n} themes.`,
        donePartial: (ok, fail) => `Deleted ${ok}, ${fail} failed (see console).`,
        reloadHint: 'Reload the page before re-importing a theme with the same name.',
        settingsDesc: 'Adds a batch delete button next to the delete button in User Settings → UI Theme. You can also open it from here.',
        settingsOpen: 'Open batch delete',
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

/** 读取酒馆下拉框里的全部主题名（和酒馆内部的 themes 数组一一对应）。 */
function getThemeNames() {
    return Array.from(document.querySelectorAll('#themes option')).map(o => o.value).filter(Boolean);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** 调酒馆自己的接口删一个主题文件。 */
async function deleteThemeOnServer(name) {
    const response = await fetch('/api/themes/delete', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
}

/** 从下拉框里拿掉一个主题；如果删掉的是当前主题，切到剩下的第一个。 */
function removeThemeFromUi(name) {
    document.querySelectorAll('#themes option').forEach(option => {
        if (option.value === name) {
            option.remove();
        }
    });
}

function fixCurrentThemeAfterDelete(deletedNames) {
    if (!deletedNames.includes(power_user.theme)) {
        return;
    }
    const remaining = getThemeNames();
    if (remaining.length > 0) {
        // 走酒馆自己的 change 处理：设置 power_user.theme、应用主题、保存设置。
        $('#themes').val(remaining[0]).trigger('change');
    } else {
        power_user.theme = undefined;
        saveSettingsDebounced();
    }
}

/** 第二次确认：列出要删的名字。 */
async function confirmDeletion(names, t) {
    const MAX_SHOWN = 30;
    const shown = names.slice(0, MAX_SHOWN).map(n => `<li>${escapeHtml(n)}</li>`).join('');
    const more = names.length > MAX_SHOWN ? `<div>${escapeHtml(t.more(names.length - MAX_SHOWN))}</div>` : '';
    const html = `
        <h3>${escapeHtml(t.confirmTitle(names.length))}</h3>
        <div>${escapeHtml(t.confirmNote)}</div>
        <ul class="tbd-confirm-list">${shown}</ul>
        ${more}
    `;
    const result = await callGenericPopup(html, POPUP_TYPE.CONFIRM, '', {
        okButton: t.confirmOk,
        cancelButton: t.cancelButton,
        allowVerticalScrolling: true,
    });
    return result === POPUP_RESULT.AFFIRMATIVE;
}

async function runDeletion(names, t) {
    const failed = [];
    const deleted = [];
    const progress = toastr.info(t.deleting(0, names.length), '', { timeOut: 0, extendedTimeOut: 0, tapToDismiss: false });

    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        try {
            await deleteThemeOnServer(name);
            removeThemeFromUi(name);
            deleted.push(name);
        } catch (error) {
            console.error(`[${MODULE_NAME}] Failed to delete theme "${name}":`, error);
            failed.push(name);
        }
        if (progress) {
            progress.find('.toast-message').text(t.deleting(i + 1, names.length));
        }
    }

    if (progress) {
        toastr.clear(progress);
    }

    fixCurrentThemeAfterDelete(deleted);

    if (failed.length === 0) {
        toastr.success(t.doneAll(deleted.length), '', { timeOut: 6000 });
    } else {
        toastr.warning(t.donePartial(deleted.length, failed.length), '', { timeOut: 10000 });
    }
    if (deleted.length > 0) {
        toastr.info(t.reloadHint, '', { timeOut: 8000 });
    }

    document.dispatchEvent(new CustomEvent('themeBatchDeleted', { detail: { deleted, failed } }));
    return { deleted, failed };
}

/** 主弹窗：勾选要删的主题。 */
async function openBatchDeleteDialog() {
    const t = getStrings();
    const names = getThemeNames();

    if (names.length === 0) {
        toastr.info(t.noThemes);
        return;
    }

    const selected = new Set();
    const root = document.createElement('div');
    root.className = 'tbd-root';
    root.innerHTML = `
        <h3 class="margin0">${escapeHtml(t.title)}</h3>
        <div class="tbd-toolbar">
            <input type="text" class="text_pole tbd-search" placeholder="${escapeHtml(t.search)}">
            <div class="menu_button tbd-select-visible">${escapeHtml(t.selectVisible)}</div>
            <div class="menu_button tbd-invert">${escapeHtml(t.invert)}</div>
            <div class="menu_button tbd-clear">${escapeHtml(t.clear)}</div>
        </div>
        <div class="tbd-count"></div>
        <div class="tbd-list"></div>
    `;

    const list = root.querySelector('.tbd-list');
    const search = root.querySelector('.tbd-search');
    const count = root.querySelector('.tbd-count');

    const items = names.map(name => {
        const label = document.createElement('label');
        label.className = 'tbd-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = name;
        const span = document.createElement('span');
        span.className = 'tbd-name';
        span.textContent = name;
        span.title = name;
        label.append(checkbox, span);
        if (name === power_user.theme) {
            const badge = document.createElement('span');
            badge.className = 'tbd-badge';
            badge.textContent = t.current;
            label.append(badge);
        }
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selected.add(name); else selected.delete(name);
            label.classList.toggle('tbd-checked', checkbox.checked);
            updateCount();
        });
        list.append(label);
        return { name, label, checkbox };
    });

    const empty = document.createElement('div');
    empty.className = 'tbd-empty';
    empty.textContent = t.empty;
    empty.style.display = 'none';
    list.append(empty);

    function visibleItems() {
        return items.filter(x => x.label.style.display !== 'none');
    }

    function updateCount() {
        count.textContent = t.count(selected.size, items.length, visibleItems().length);
    }

    function applyFilter() {
        const query = search.value.trim().toLowerCase();
        let shown = 0;
        for (const item of items) {
            const match = !query || item.name.toLowerCase().includes(query);
            item.label.style.display = match ? '' : 'none';
            if (match) shown++;
        }
        empty.style.display = shown === 0 ? '' : 'none';
        updateCount();
    }

    function setChecked(item, checked) {
        if (item.checkbox.checked === checked) return;
        item.checkbox.checked = checked;
        item.checkbox.dispatchEvent(new Event('change'));
    }

    search.addEventListener('input', applyFilter);
    root.querySelector('.tbd-select-visible').addEventListener('click', () => {
        visibleItems().forEach(item => setChecked(item, true));
    });
    root.querySelector('.tbd-invert').addEventListener('click', () => {
        visibleItems().forEach(item => setChecked(item, !item.checkbox.checked));
    });
    root.querySelector('.tbd-clear').addEventListener('click', () => {
        items.forEach(item => setChecked(item, false));
    });

    applyFilter();

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

    // 按下拉框里的顺序删，方便对照。
    const toDelete = names.filter(n => selected.has(n));
    if (!(await confirmDeletion(toDelete, t))) {
        return;
    }
    await runDeletion(toDelete, t);
}

function addOpenButton() {
    const t = getStrings();
    if (document.getElementById('tbd-open-button')) {
        return;
    }
    const button = document.createElement('div');
    button.id = 'tbd-open-button';
    button.className = 'menu_button menu_button_icon margin0';
    button.title = t.openButton;
    button.innerHTML = '<i class="fa-solid fa-broom"></i>';
    button.addEventListener('click', () => openBatchDeleteDialog());

    // 新版酒馆用 ui-preset-delete-button，旧版用 ui_preset_delete_button。
    const anchor = document.getElementById('ui-preset-delete-button') || document.getElementById('ui_preset_delete_button');
    if (anchor) {
        anchor.insertAdjacentElement('afterend', button);
        return;
    }
    const fallback = document.querySelector('#UI-presets-block h4 .flex-container');
    if (fallback) {
        fallback.append(button);
        return;
    }
    console.warn(`[${MODULE_NAME}] Could not find the UI theme block; button not added.`);
}

function addSettingsPanel() {
    const t = getStrings();
    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container || document.getElementById('tbd-settings')) {
        return;
    }
    const panel = document.createElement('div');
    panel.id = 'tbd-settings';
    panel.className = 'tbd-settings';
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

jQuery(() => {
    addOpenButton();
    addSettingsPanel();
});

export { openBatchDeleteDialog };
