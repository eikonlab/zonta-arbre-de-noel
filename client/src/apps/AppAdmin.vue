<template>
  <div
    class="admin-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <div
      class="pull-indicator"
      :style="{
        height: isRefreshing ? '60px' : pullDistance + 'px',
        opacity: Math.min(pullDistance / 50, 1),
      }"
    >
      <div class="pull-content">
        <span v-if="isRefreshing" class="refresh-spinner">🔄</span>
        <span v-else-if="pullDistance > 100">⬆️ Relâcher pour actualiser</span>
        <span v-else>⬇️ Tirer pour actualiser</span>
      </div>
    </div>

    <header class="admin-header">
      <h1>Modération des Messages</h1>
      <div class="header-actions">
        <button
          @click="toggleNotifications"
          class="btn btn-notification"
          v-if="notifSupported"
        >
          <span v-if="!notifSubscribed">🔔 Activer les notifications</span>
          <span v-else>✅ Notifications activées</span>
        </button>
        <div v-else-if="showNotifHelp" class="notif-help">
          <small>📱 Notifications non disponibles</small>
        </div>
        <button @click="handleLogout" class="btn btn-logout">
          🚪 Déconnexion
        </button>
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

      <div v-else class="messages-list">
        <!-- Desktop Table View -->
        <div class="desktop-view">
          <table class="messages-table">
            <thead>
              <tr>
                <th>Nom</th>

                <th>Date</th>
                <th>Texte</th>
                <th colspan="2">Actions</th>
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
                  <div class="date-container">
                    <span class="date">{{
                      formatDate(message.createdAt)
                    }}</span>
                    <select
                      v-if="message.priorityNumber"
                      class="priority-select"
                      :value="message.priorityNumber"
                      @change="updatePriority(message, $event)"
                    >
                      <option v-for="n in 5" :key="n" :value="n">
                        Écran {{ n }}
                      </option>
                    </select>
                  </div>
                </td>
                <td>
                  <span class="message-content">{{ message.content }}</span>
                </td>

                <td>
                  <label
                    class="toggle-switch"
                    :title="
                      message.flagged
                        ? `Message signalé (${message.flagged}) — ne s'affichera pas sur le mur public`
                        : 'Afficher sur le mur'
                    "
                  >
                    <input
                      type="checkbox"
                      :checked="!message.hidden && !message.flagged"
                      @change="toggleVisibility(message, $event)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </td>
                <td>
                  <button
                    @click="deleteMessage(message.id)"
                    class="btn-delete"
                    title="Supprimer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-view">
          <div
            v-for="message in filteredMessages"
            :key="message.id"
            class="message-card-mobile"
            :class="{
              flagged: message.flagged,
              hidden: message.hidden,
              toxic: message.flagged && message.flagged.includes('toxic'),
              'off-topic':
                message.flagged && message.flagged.includes('hors-sujet'),
            }"
          >
            <div class="message-card-header">
              <div class="message-card-meta">
                <span class="author">{{ message.author }}</span>
                <div class="date-priority-group">
                  <span class="date">{{ formatDate(message.createdAt) }}</span>
                  <select
                    v-if="message.priorityNumber"
                    class="priority-select"
                    :value="message.priorityNumber"
                    @change="updatePriority(message, $event)"
                  >
                    <option v-for="n in 5" :key="n" :value="n">
                      Écran {{ n }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="message-card-badges">
                <span
                  v-if="message.toxicity !== null"
                  class="toxicity-score"
                  :class="getToxicityClass(message.toxicity)"
                >
                  {{ Math.round(message.toxicity * 100) }}%
                </span>
                <span
                  v-if="message.flagged"
                  class="flag-badge"
                  :class="getFlagClass(message.flagged)"
                >
                  {{ message.flagged }}
                </span>
              </div>
            </div>

            <div v-if="message.flagReason" class="message-card-reason">
              {{ message.flagReason }}
            </div>

            <div class="message-card-content">
              <p>{{ message.content }}</p>
            </div>

            <div class="message-card-actions">
              <label class="toggle-switch-mobile">
                <input
                  type="checkbox"
                  :checked="!message.hidden && !message.flagged"
                  @change="toggleVisibility(message, $event)"
                />
                <span class="toggle-slider-mobile"></span>
                <span class="toggle-label">{{
                  !message.hidden && !message.flagged ? "Visible" : "Masqué"
                }}</span>
              </label>
              <button
                @click="deleteMessage(message.id)"
                class="btn-delete-mobile"
                title="Supprimer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "../composables/useAuth";
import { usePushNotifications } from "../composables/usePushNotifications";
import { useRouter } from "vue-router";

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
      showNotifHelp: true,
      pullStartY: 0,
      pullDistance: 0,
      isRefreshing: false,
    };
  },

  setup() {
    const { logout } = useAuth();
    const router = useRouter();
    const {
      isSupported: notifSupported,
      isSubscribed: notifSubscribed,
      subscribe,
      unsubscribe,
    } = usePushNotifications();

    const handleLogout = () => {
      logout();
      router.push("/admin/login");
    };

    const toggleNotifications = async () => {
      try {
        if (notifSubscribed.value) {
          await unsubscribe();
        } else {
          await subscribe();
        }
      } catch (error) {
        console.error("Error toggling notifications:", error);
        alert(
          "Erreur lors de la gestion des notifications. Vérifiez que vous avez autorisé les notifications."
        );
      }
    };

    return {
      handleLogout,
      notifSupported,
      notifSubscribed,
      toggleNotifications,
    };
  },

  computed: {
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

      this.socket.on("connect", () => {
        // Register as admin to receive privileged events
        this.socket.emit("register-admin");
        // Reload messages to ensure we didn't miss anything while disconnected
        this.loadMessages();
      });

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

    async toggleVisibility(message, e) {
      try {
        const wantVisible = e?.target?.checked === true;
        const wasFlagged = Boolean(message.flagged);
        // Update local state optimistically
        message.hidden = !wantVisible;
        const API_URL =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
        // If admin wants it visible and it was flagged, auto-approve: clear flags
        const payload =
          wantVisible && wasFlagged
            ? { hidden: false, flagged: null, flagReason: null }
            : { hidden: !wantVisible };
        const { data } = await axios.patch(
          `${API_URL}/messages/${message.id}`,
          payload
        );
        // Sync local copy with server state
        const index = this.messages.findIndex((m) => m.id === message.id);
        if (index !== -1) this.messages[index] = data;
      } catch (error) {
        // Revert on error
        message.hidden = !message.hidden; // naive revert
        console.error("Erreur lors de la mise à jour:", error);
        alert("Erreur lors de la mise à jour du message");
      }
    },

    async updatePriority(message, e) {
      const newPriority = parseInt(e.target.value);
      const oldPriority = message.priorityNumber;

      try {
        // Optimistic update
        message.priorityNumber = newPriority;

        const API_URL =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

        const { data } = await axios.patch(
          `${API_URL}/messages/${message.id}`,
          { priorityNumber: newPriority }
        );

        // Sync local copy with server state
        const index = this.messages.findIndex((m) => m.id === message.id);
        if (index !== -1) this.messages[index] = data;
      } catch (error) {
        // Revert on error
        message.priorityNumber = oldPriority;
        console.error("Erreur lors de la mise à jour de l'écran:", error);
        alert("Erreur lors de la mise à jour de l'écran");
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

    handleTouchStart(e) {
      if (window.scrollY === 0) {
        this.pullStartY = e.touches[0].clientY;
      }
    },

    handleTouchMove(e) {
      if (this.pullStartY && window.scrollY === 0) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - this.pullStartY;
        if (diff > 0) {
          // Add resistance
          this.pullDistance = Math.pow(diff, 0.8);
          // Prevent default scrolling if we are pulling down
          if (diff > 10 && e.cancelable) {
            e.preventDefault();
          }
        }
      }
    },

    async handleTouchEnd() {
      if (this.pullDistance > 100) {
        this.isRefreshing = true;
        await this.refreshMessages();
        this.isRefreshing = false;
      }
      this.pullStartY = 0;
      this.pullDistance = 0;
    },
  },
};
</script>

<style scoped>
.tag-badge {
  display: inline-block;
  padding: 2px 10px;
  margin-right: 5px;
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
  background: url("/bg.jpg") #fdbc2e;
  background-size: cover;
  background-position: center;
}

.admin-header {
  background: white;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.admin-header h1 {
  margin: 0;
  color: #5c3317;
  font-size: 2.5em;
  font-weight: 700;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.controls {
  background: white;
  padding: 20px;
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

.btn-notification {
  background: #5c3317;
  color: #fdbc2e;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.3);
  white-space: normal;
  text-align: center;
  line-height: 1.2;
}

.btn-notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.4);
}

.btn-logout {
  border: 2px solid #5c3317;
  background: rgba(92, 51, 23, 0.1);
  color: #5c3317;
}

.btn-logout:hover {
  background: #5c3317;
  color: #fdbc2e;
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

.notif-help {
  background: rgba(92, 51, 23, 0.1);
  color: #5c3317;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 0.9em;
}

.btn-logout {
  background: rgba(92, 51, 23, 0.1);
  color: #5c3317;
  border: 2px solid #5c3317;
}

.btn-logout:hover {
  background: #5c3317;
  color: #fdbc2e;
}

.messages-container {
  background: white;
  padding: 30px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.desktop-view {
  display: block;
}

.mobile-view {
  display: none;
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
  opacity: 0.4;
}

/* Mobile Card Styles */
.message-card-mobile {
  background: white;
  border: 1px solid rgba(92, 51, 23, 0.15);
  border-left: 4px solid #5c3317;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(92, 51, 23, 0.1);
}

.message-card-mobile.flagged,
.message-card-mobile.toxic {
  border-left-color: #ffc107;
  background: #fff9e6;
}

.message-card-mobile.off-topic {
  border-left-color: #6c757d;
  background: #f8f9fa;
}

.message-card-mobile.hidden {
  opacity: 0.4;
}

.message-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 10px;
}

.message-card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.message-card-meta .author {
  font-weight: 700;
  color: #5c3317;
  font-size: 1.1em;
}

.message-card-meta .date {
  color: rgba(92, 51, 23, 0.6);
  font-size: 0.85em;
}

.message-card-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.message-card-content {
  margin: 12px 0;
  padding: 12px;
  background: rgba(92, 51, 23, 0.03);
  border-radius: 6px;
}

.message-card-content p {
  margin: 0;
  font-size: 1em;
  line-height: 1.5;
  color: #5c3317;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-card-reason {
  margin: 8px 0;
  padding: 8px 10px;
  border-left: 3px solid rgba(92, 51, 23, 0.3);
  border-radius: 4px;
  font-size: 0.85em;
  color: rgba(92, 51, 23, 0.7);
  font-style: italic;
  word-break: break-word;
}

.message-card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(92, 51, 23, 0.1);
  gap: 10px;
}

/* Mobile Toggle Switch */
.toggle-switch-mobile {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-switch-mobile input[type="checkbox"] {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider-mobile {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  background-color: rgba(92, 51, 23, 0.2);
  border: 2px solid rgba(92, 51, 23, 0.3);
  transition: all 0.3s ease;
  border-radius: 34px;
}

.toggle-slider-mobile:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #5c3317;
  transition: all 0.3s ease;
  border-radius: 50%;
}

.toggle-switch-mobile input:checked + .toggle-slider-mobile {
  background-color: #5c3317;
  border-color: #5c3317;
}

.toggle-switch-mobile input:checked + .toggle-slider-mobile:before {
  transform: translateX(24px);
  background-color: #fdbc2e;
}

.toggle-label {
  font-weight: 600;
  color: #5c3317;
  font-size: 0.95em;
}

/* Mobile Delete Button */
.btn-delete-mobile {
  background: transparent;
  border: 2px solid rgba(92, 51, 23, 0.3);
  color: #5c3317;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95em;
  transition: all 0.3s ease;
}

.btn-delete-mobile:hover {
  background: #5c3317;
  border-color: #5c3317;
  color: #fdbc2e;
}

.btn-delete-mobile svg {
  transition: transform 0.3s ease;
}

.btn-delete-mobile:hover svg {
  transform: rotate(90deg);
}

.message-card-actions .btn {
  white-space: nowrap;
}

.message-card {
  background: white;
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
  opacity: 0.4;
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

.status-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.status-reason {
  font-size: 0.8em;
  color: rgba(92, 51, 23, 0.7);
  font-style: italic;
  word-break: break-word;
}

.date-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-priority-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.priority-pill {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75em;
  font-weight: 600;
  color: white;
  background: #5c3317;
  border-radius: 12px;
  white-space: nowrap;
}

.priority-select {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75em;
  font-weight: 600;
  color: white;
  background: #5c3317;
  border: none;
  border-radius: 12px;
  white-space: nowrap;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
}

.priority-select:hover {
  background: #7a4420;
}

.priority-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(92, 51, 23, 0.3);
}

.toxicity-score {
  padding: 2px 4px;
  font-size: 0.75em;
  margin: 3px;
  display: inline-block;
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

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  cursor: pointer;
}

.toggle-switch input[type="checkbox"] {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(92, 51, 23, 0.2);
  border: 2px solid rgba(92, 51, 23, 0.3);
  transition: all 0.3s ease;
  border-radius: 34px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #5c3317;
  transition: all 0.3s ease;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #5c3317;
  border-color: #5c3317;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
  background-color: #fdbc2e;
}

.toggle-switch:hover .toggle-slider {
  box-shadow: 0 0 8px rgba(92, 51, 23, 0.3);
}

/* Delete Button Styles */
.btn-delete {
  background: transparent;
  border: 2px solid rgba(92, 51, 23, 0.3);
  color: #5c3317;
  padding: 2px;
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  width: 28;
  height: 28px;
}

.btn-delete:hover {
  background: #5c3317;
  border-color: #5c3317;
  color: #fdbc2e;
}

.btn-delete svg {
  display: block;
}

/* Pull to Refresh Styles */
.pull-indicator {
  overflow: hidden;
  transition: height 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #5c3317;
  font-weight: bold;
  border-radius: 0 0 20px 20px;
  margin: -20px -20px 20px -20px;
  box-shadow: 0 4px 10px rgba(92, 51, 23, 0.1);
}

.pull-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

.refresh-spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }

  .admin-header {
    padding: 15px;
    flex-direction: column;
    align-items: stretch;
  }

  .admin-header h1 {
    font-size: 1.5em;
    text-align: center;
    line-height: 1.3;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .header-actions .btn {
    flex: 1;
    min-width: 140px;
    font-size: 0.9em;
    padding: 10px 16px;
  }

  .notif-help {
    flex: 1;
    text-align: center;
    min-width: 140px;
  }

  .controls {
    padding: 15px;
    flex-direction: column;
    align-items: stretch;
  }

  .filter-controls {
    flex-direction: column;
    gap: 12px;
  }

  .checkbox-container {
    font-size: 1em;
    padding: 8px 0;
  }

  .messages-container {
    padding: 15px;
  }

  /* Hide desktop table on mobile */
  .desktop-view {
    display: none;
  }

  /* Show mobile cards on mobile */
  .mobile-view {
    display: block;
  }

  .loading,
  .no-messages {
    padding: 30px 15px;
    font-size: 1.1em;
  }
}

/* Tablet adjustments */
@media (max-width: 1024px) and (min-width: 769px) {
  .admin-header h1 {
    font-size: 2em;
  }

  .messages-table th,
  .messages-table td {
    padding: 10px 6px;
    font-size: 0.9em;
  }

  .flag-reason {
    max-width: 80px;
  }
}
</style>
