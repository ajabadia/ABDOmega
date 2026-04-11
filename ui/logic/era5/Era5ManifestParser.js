/**
 * OMEGA Era 5.2 Manifest Parser
 * Translates the role-based registry and aseptic layout into a structured UI Model.
 */
export class Era5ManifestParser {
    /**
     * Parses the raw YAML-derived JSON manifest into a Tab-based hierarchy.
     */
    static parse(manifest) {
        const tabsMap = new Map();
        const entities = manifest.registry || [];
        entities.forEach((entity) => {
            const pres = entity.presentation || {};
            let tabName = (pres.tab || '').toUpperCase();
            // Smart Routing for Era 5.2 Patching Sanctuary
            if (!tabName && (entity.direction === 'output' || entity.direction === 'input')) {
                tabName = 'PATCHING';
            }
            if (!tabName)
                tabName = 'GENERAL';
            const groupName = (pres.group || 'UNGROUPED').toUpperCase();
            if (!tabsMap.has(tabName)) {
                tabsMap.set(tabName, new Map());
            }
            const tabGroups = tabsMap.get(tabName);
            if (!tabGroups.has(groupName)) {
                tabGroups.set(groupName, []);
            }
            tabGroups.get(groupName).push(this.normalizeEntity(entity));
        });
        // Convert Map to sorted array of tabs
        return Array.from(tabsMap.entries()).map(([tabId, groupsMap]) => {
            // Sort entities within each group by 'order'
            groupsMap.forEach((list) => {
                list.sort((a, b) => a.presentation.order - b.presentation.order);
            });
            return {
                id: tabId,
                groups: groupsMap
            };
        }).sort((a, b) => {
            // Force GENERAL to be first if it exists
            if (a.id === 'GENERAL')
                return -1;
            if (b.id === 'GENERAL')
                return 1;
            return a.id.localeCompare(b.id);
        });
    }
    static normalizeEntity(raw) {
        return {
            id: raw.id,
            label: raw.label || raw.id.toUpperCase(),
            roles: raw.roles || ['control'],
            direction: raw.direction || 'input',
            precision: raw.precision ?? 2,
            range: raw.range,
            options: raw.options,
            presentation: {
                tab: (raw.presentation?.tab || 'GENERAL').toUpperCase(),
                group: (raw.presentation?.group || 'UNGROUPED').toUpperCase(),
                order: raw.presentation?.order || 99,
                control: raw.presentation?.control || 'knob'
            },
            attachments: raw.attachments || []
        };
    }
}
//# sourceMappingURL=Era5ManifestParser.js.map