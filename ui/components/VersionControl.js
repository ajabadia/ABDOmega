/**
 * OMEGA Version Control (Snapshot History) Component
 */
class VersionControl {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPresetId = null;
    }

    async refresh(presetId) {
        if (!presetId) return;
        this.currentPresetId = presetId;
        const history = await window.omegaRPC.getHistory(presetId);
        this.render(history);
    }

    render(history) {
        if (!this.container) return;

        const snapshots = history.snapshots || [];
        const branches = history.branches || [];

        this.container.innerHTML = `
            <div class="vc-header">
                <h3>VERSION HISTORY: ${history.presetId}</h3>
                <div class="branch-info">Branch: <strong>${history.currentBranch}</strong></div>
            </div>
            <div class="vc-timeline">
                ${snapshots.reverse().map(s => `
                    <div class="snapshot-item" onclick="window.omegaVersionControl.checkout('${s.hash}')">
                        <div class="snap-hash">${s.hash.substring(0, 7)}</div>
                        <div class="snap-details">
                            <div class="snap-author">${s.author}</div>
                            <div class="snap-message">${s.message}</div>
                            <div class="snap-time">${new Date(s.timestamp * 1000).toLocaleString()}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="vc-actions">
                <button onclick="window.omegaVersionControl.showSnapshotDialog()">SAVE SNAPSHOT</button>
            </div>
        `;
    }

    async checkout(hash) {
        if (!confirm("Checkout snapshot " + hash.substring(0, 7) + "?")) return;
        await window.omegaRPC.checkout(this.currentPresetId, hash);
        // Refresh after checkout to update UI (maybe current state changes)
        this.refresh(this.currentPresetId);
    }

    async showSnapshotDialog() {
        const message = prompt("Enter snapshot description:");
        if (!message) return;
        
        const author = "User"; // Could be from preferences
        await window.omegaRPC.saveSnapshot(author, message);
        this.refresh(this.currentPresetId);
    }
}

window.VersionControl = VersionControl;
