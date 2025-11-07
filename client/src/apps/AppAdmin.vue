<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Administration & Modération des Messages</h1>
      <div class="stats">
        <div class="stat-card">
          <span class="stat-number">{{ totalMessages }}</span>
          <span class="stat-label">Messages Total</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ visibleMessages }}</span>
          <span class="stat-label">Visibles</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ hiddenMessages }}</span>
          <span class="stat-label">Masqués</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">{{ flaggedMessages }}</span>
          <span class="stat-label">Signalés</span>
        </div>
      </div>
    </header>

    <div class="controls">
      <div class="filter-controls">
        <label class="checkbox-container">
          <input type="checkbox" v-model="showVisible" />
          <span class="checkmark"></span>
          Afficher visibles
        </label>
        <label class="checkbox-container">
          <input type="checkbox" v-model="showHidden" />
          <span class="checkmark"></span>
          Afficher masqués
        </label>
        <label class="checkbox-container">
          <input type="checkbox" v-model="showFlagged" />
          <span class="checkmark"></span>
          Afficher signalés
        </label>
      </div>
    </div>

    <div class="messages-container">
      <div v-if="loading" class="loading">Chargement des messages...</div>

      <div v-else-if="filteredMessages.length === 0" class="no-messages">
        Aucun message à afficher avec les filtres actuels.
      </div>

      <div v-else class="messages-grid">
        <table class="messages-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Status</th>
              <th>Raison</th>
              <th>Date</th>
              <th>Texte</th>
              <th>Afficher</th>
              <th>Supprimer</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="message in filteredMessages"
              :key="message.id"
              :class="{
                flagged: message.flagged,
                hidden: message.hidden,
                toxic: message.flagged && message.flagged.includes('toxic'),
                'off-topic':
                  message.flagged && message.flagged.includes('hors-sujet'),
              }"
            >
              <td>
                <span class="author">{{ message.author }}</span>
              </td>
              <td>
                <span
                  v-if="message.toxicity !== null"
                  class="toxicity-score"
                  :class="getToxicityClass(message.toxicity)"
                >
                  Toxicité: {{ Math.round(message.toxicity * 100) }}%
                </span>
                <span
                  v-if="message.flagged"
                  class="flag-badge"
                  :class="getFlagClass(message.flagged)"
                >
                  {{ message.flagged }}
                </span>
              </td>
              <td>
                <span
                  v-if="message.flagReason"
                  class="flag-reason"
                  :title="message.flagReason"
                >
                  {{ shortReason(message.flagReason) }}
                </span>
                <span v-else>-</span>
              </td>
              <td>
                <span class="date">{{ formatDate(message.createdAt) }}</span>
              </td>
              <td>
                <span class="message-content">{{ message.content }}</span>
              </td>

              <td>
                <label class="visibility-toggle">
                  <input
                    type="checkbox"
                    :checked="!message.hidden"
                    :title="
                      message.flagged
                        ? `Message signalé (${message.flagged}) — ne s'affichera pas sur le mur public`
                        : 'Afficher sur le mur'
                    "
                    @change="toggleVisibility(message)"
                  />
                </label>
              </td>
              <td>
                <button
                  @click="deleteMessage(message.id)"
                  class="btn btn-danger btn-small"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { io } from "socket.io-client";

export default {
  name: "AdminApp",
  data() {
    return {
      messages: [],
      loading: true,
      socket: null,
      showVisible: true,
      showHidden: true,
      showFlagged: true,
    };
  },

  computed: {
    totalMessages() {
      return this.messages.length;
    },

    visibleMessages() {
      return this.messages.filter((m) => !m.hidden).length;
    },

    hiddenMessages() {
      return this.messages.filter((m) => m.hidden).length;
    },

    flaggedMessages() {
      return this.messages.filter((m) => m.flagged).length;
    },

    filteredMessages() {
      return this.messages
        .filter((message) => {
          if (!this.showVisible && !message.hidden) return false;
          if (!this.showHidden && message.hidden) return false;
          if (!this.showFlagged && message.flagged) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
  },

  async mounted() {
    await this.initializeSocket();
    await this.loadMessages();
  },

  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  },

  methods: {
    shortReason(reason) {
      if (!reason) return "";
      // keep concise: prefix before ':' and trimmed regex if present
      const [kind, detail] = reason.split(":", 2);
      if (!detail) return kind;
      // strip slashes for regex visuals
      const d = detail.replaceAll("/", "").slice(0, 28);
      return `${kind}:${d}${detail.length > 28 ? "…" : ""}`;
    },
    async initializeSocket() {
      const API_URL =
        import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
      this.socket = io(API_URL);

      // Register as admin to receive privileged events if needed later
      this.socket.emit("register-admin");

      this.socket.on("new-message", (message) => {
        // Respect server-provided hidden flag
        this.messages.unshift(message);
      });

      // Receive admin-only new messages (hidden on public)
      this.socket.on("admin-new-message", (message) => {
        this.messages.unshift(message);
      });

      this.socket.on("message-updated", (updatedMessage) => {
        const index = this.messages.findIndex(
          (m) => m.id === updatedMessage.id
        );
        if (index !== -1) {
          this.messages[index] = updatedMessage;
        }
      });

      this.socket.on("message-deleted", (messageId) => {
        this.messages = this.messages.filter((m) => m.id !== messageId);
      });
    },

    async loadMessages() {
      try {
        this.loading = true;
        const API_URL =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
        const response = await axios.get(`${API_URL}/messages`);
        this.messages = response.data.map((message) => ({
          ...message,
          hidden: message.hidden || false,
        }));
      } catch (error) {
        console.error("Erreur lors du chargement des messages:", error);
        alert("Erreur lors du chargement des messages");
      } finally {
        this.loading = false;
      }
    },

    async refreshMessages() {
      await this.loadMessages();
    },

    async toggleVisibility(message) {
      try {
        message.hidden = !message.hidden;
        const API_URL =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
        // In a real app, you would send this update to the server
        await axios.patch(`${API_URL}/messages/${message.id}`, {
          hidden: message.hidden,
        });
      } catch (error) {
        // Revert on error
        message.hidden = !message.hidden;
        console.error("Erreur lors de la mise à jour:", error);
        alert("Erreur lors de la mise à jour du message");
      }
    },

    async deleteMessage(messageId) {
      if (!confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) return;

      try {
        const API_URL =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
        await axios.delete(`${API_URL}/messages/${messageId}`);
        this.messages = this.messages.filter((m) => m.id !== messageId);
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression du message");
      }
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    getFlagClass(flagged) {
      if (flagged.includes("toxic")) return "toxic";
      if (flagged.includes("hors-sujet")) return "off-topic";
      return "flagged";
    },

    getToxicityClass(toxicity) {
      if (toxicity > 0.7) return "high";
      if (toxicity > 0.4) return "medium";
      return "low";
    },
  },
};
</script>

<style scoped>
.tag-badge {
  display: inline-block;
  padding: 2px 10px;
  margin-right: 5px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  color: white;
  background: #888;
}
.tag-badge.toxic {
  background: #dc3545;
}
.tag-badge.off-topic {
  background: #6c757d;
}
.admin-container {
  min-height: 100vh;
  padding: 20px;
  background: #fdbc2e;
}

.admin-header {
  background: white;
  padding: 30px;
  border-radius: 24px;
  margin-bottom: 30px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.admin-header h1 {
  margin: 0 0 20px 0;
  color: #5c3317;
  font-size: 2.5em;
  text-align: center;
  font-weight: 700;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: #5c3317;
  padding: 20px;
  border-radius: 16px;
  text-align: center;
  color: #fdbc2e;
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(92, 51, 23, 0.4);
}

.stat-number {
  display: block;
  font-size: 2.5em;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 1em;
  opacity: 0.9;
  font-weight: 600;
}

.controls {
  background: white;
  padding: 20px;
  border-radius: 24px;
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.filter-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1.1em;
  color: #5c3317;
  font-weight: 600;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1.2);
  cursor: pointer;
  accent-color: #5c3317;
}

.action-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #5c3317;
  color: #fdbc2e;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.4);
}

.btn-success {
  background: #5c3317;
  color: #fdbc2e;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.3);
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.4);
}

.btn-danger {
  border: 2px solid #5c3317;
  background: rgba(92, 51, 23, 0.1);
  color: #5c3317;
}

.btn-danger:hover {
  background: #5c3317;
  color: #fdbc2e;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.9em;
}

.messages-container {
  background: white;
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.loading,
.no-messages {
  text-align: center;
  padding: 50px;
  font-size: 1.3em;
  color: #5c3317;
  font-weight: 600;
}

.messages-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.messages-table th,
.messages-table td {
  padding: 12px 8px;
  border-bottom: 1px solid rgba(92, 51, 23, 0.1);
  text-align: left;
  vertical-align: top;
}
.messages-table th {
  background: rgba(92, 51, 23, 0.05);
  font-weight: bold;
  color: #5c3317;
  border-bottom: 2px solid #5c3317;
}
.messages-table tr.flagged,
.messages-table tr.toxic {
  background: #fff9e6;
  border-left: 5px solid #ffc107;
}
.messages-table tr.hidden {
  opacity: 0.6;
  background: rgba(92, 51, 23, 0.05);
}

.message-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.1);
  border-left: 5px solid #5c3317;
  transition: all 0.3s ease;
}

.message-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.2);
}

.message-card.flagged {
  border-left-color: #ffc107;
  background: #fff9e6;
}

.message-card.toxic {
  border-left-color: #dc3545;
  background: #ffe6e6;
}

.message-card.off-topic {
  border-left-color: #6c757d;
  background: #f8f9fa;
}

.message-card.hidden {
  opacity: 0.6;
  background: rgba(92, 51, 23, 0.05);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.message-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.author {
  font-weight: bold;
  color: #5c3317;
  font-size: 1.1em;
}

.date {
  color: rgba(92, 51, 23, 0.7);
  font-size: 0.9em;
}

.message-status {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}

.flag-badge {
  padding: 2px 4px;
  border-radius: 20px;
  margin: 3px;
  display: inline-block;
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
  color: white;
}

.flag-badge.toxic {
  background: #dc3545;
}

.flag-badge.off-topic {
  background: #6c757d;
}

.flag-badge.flagged {
  background: #ffc107;
  color: #333;
}

.flag-reason {
  display: inline-block;
  padding: 2px 6px;
  font-size: 0.65em;
  border-radius: 6px;
  background: rgba(92, 51, 23, 0.08);
  color: #5c3317;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
  border: 1px solid rgba(92, 51, 23, 0.15);
}

.toxicity-score {
  padding: 2px 4px;
  font-size: 0.75em;
  margin: 3px;
  display: inline-block;
  border-radius: 10px;
  font-weight: bold;
}

.toxicity-score.high {
  background: #dc3545;
  color: white;
}

.toxicity-score.medium {
  background: #ffc107;
  color: #333;
}

.toxicity-score.low {
  background: #28a745;
  color: white;
}

.message-content {
  margin: 15px 0;
  font-size: 1.1em;
  line-height: 1.6;
  color: #5c3317;
  word-wrap: break-word;
}

.message-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(92, 51, 23, 0.1);
  flex-wrap: wrap;
  gap: 10px;
}

.visibility-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
  color: #5c3317;
}

.visibility-toggle input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1.2);
  cursor: pointer;
  accent-color: #5c3317;
}

.toggle-label {
  font-size: 1em;
}

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }

  .admin-header {
    padding: 20px;
  }

  .admin-header h1 {
    font-size: 2em;
  }

  .controls {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-controls,
  .action-controls {
    justify-content: center;
  }

  .message-header {
    flex-direction: column;
    align-items: stretch;
  }

  .message-status {
    align-items: flex-start;
  }

  .message-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}
</style>
