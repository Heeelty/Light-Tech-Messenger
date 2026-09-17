// ============================================================
// LIGHTTECH MESSENGER
// ============================================================

const SUPABASE_URL = "https://esgdaurnzgpqyritppti.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_2IZItwwYVwCUAD8-We5SLw_Xo7gpy1Y";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// ELEMENTS
// ============================================================

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

const authSubmit = document.getElementById("auth-submit");
const toggleAuth = document.getElementById("toggle-auth");

const usernameField = document.getElementById("username-field");
const usernameInput = document.getElementById("username");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authError = document.getElementById("auth-error");
const authSuccess = document.getElementById("auth-success");

const profileName = document.getElementById("profile-name");
const profileAvatar = document.getElementById("profile-avatar");
const profileStatus = document.getElementById("profile-status");

const logoutButton = document.getElementById("logout-button");

const userSearch = document.getElementById("user-search");
const searchResults = document.getElementById("search-results");

const chatList = document.getElementById("chat-list");

const emptyChat = document.getElementById("empty-chat");
const activeChat = document.getElementById("active-chat");

const chatAvatar = document.getElementById("chat-avatar");
const chatName = document.getElementById("chat-name");
const chatStatus = document.getElementById("chat-status");

const messagesContainer = document.getElementById("messages");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");


// ============================================================
// STATE
// ============================================================

let isRegisterMode = false;
let currentUser = null;
let currentProfile = null;

let currentChat = null;
let realtimeChannel = null;


// ============================================================
// HELPERS
// ============================================================

function clearAuthMessages() {
    authError.textContent = "";
    authSuccess.textContent = "";
}


function showAuthError(message) {
    authError.textContent = message;
    authSuccess.textContent = "";
}


function showAuthSuccess(message) {
    authSuccess.textContent = message;
    authError.textContent = "";
}


function getInitial(name) {
    if (!name) return "U";

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}


function formatTime(date) {
    return new Date(date).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ============================================================
// AUTH MODE
// ============================================================

toggleAuth.addEventListener("click", () => {

    isRegisterMode = !isRegisterMode;

    clearAuthMessages();

    if (isRegisterMode) {

        authTitle.textContent = "Регистрация";

        authSubtitle.textContent =
            "Создайте новый аккаунт";

        authSubmit.textContent =
            "Зарегистрироваться";

        toggleAuth.textContent =
            "Уже есть аккаунт? Войти";

        usernameField.hidden = false;

        usernameInput.required = true;

    } else {

        authTitle.textContent = "Вход";

        authSubtitle.textContent =
            "Войдите в свой аккаунт";

        authSubmit.textContent =
            "Войти";

        toggleAuth.textContent =
            "Нет аккаунта? Зарегистрироваться";

        usernameField.hidden = true;

        usernameInput.required = false;
    }
});


// ============================================================
// REGISTER / LOGIN
// ============================================================

authForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearAuthMessages();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const username = usernameInput.value.trim();

    if (!email || !password) {
        showAuthError("Введите email и пароль.");
        return;
    }

    if (isRegisterMode && !username) {
        showAuthError("Введите имя пользователя.");
        return;
    }

    authSubmit.disabled = true;

    authSubmit.textContent =
        isRegisterMode
            ? "Регистрация..."
            : "Вход...";

    try {

        if (isRegisterMode) {

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password,

                    options: {
                        data: {
                            username
                        }
                    }
                });

            if (error) {
                throw error;
            }

            if (!data.session) {

                showAuthSuccess(
                    "Аккаунт создан. Проверьте email для подтверждения."
                );

            } else {

                await initializeUser(data.user);
            }

        } else {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            await initializeUser(data.user);
        }

    } catch (error) {

        console.error(error);

        showAuthError(
            translateSupabaseError(error.message)
        );

    } finally {

        authSubmit.disabled = false;

        authSubmit.textContent =
            isRegisterMode
                ? "Зарегистрироваться"
                : "Войти";
    }
});


// ============================================================
// ERROR TRANSLATION
// ============================================================

function translateSupabaseError(message) {

    if (!message) {
        return "Произошла неизвестная ошибка.";
    }

    const lower = message.toLowerCase();

    if (lower.includes("invalid login credentials")) {
        return "Неверный email или пароль.";
    }

    if (lower.includes("email not confirmed")) {
        return "Сначала подтвердите email.";
    }

    if (lower.includes("user already registered")) {
        return "Пользователь с таким email уже существует.";
    }

    if (lower.includes("password")) {
        return "Пароль не соответствует требованиям.";
    }

    if (lower.includes("rate limit")) {
        return "Слишком много запросов. Попробуйте позже.";
    }

    return message;
}


// ============================================================
// INITIALIZE USER
// ============================================================

async function initializeUser(user) {

    currentUser = user;

    await loadProfile();

    showApplication();

    await loadChats();
}


// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .maybeSingle();

    if (error) {

        console.error("Profile error:", error);

        currentProfile = {
            id: currentUser.id,
            username:
                currentUser.user_metadata?.username ||
                currentUser.email?.split("@")[0] ||
                "user"
        };

        return;
    }

    if (!data) {

        const username =
            currentUser.user_metadata?.username ||
            currentUser.email?.split("@")[0] ||
            `user_${currentUser.id.slice(0, 6)}`;

        const { data: created, error: createError } =
            await supabaseClient
                .from("profiles")
                .insert({
                    id: currentUser.id,
                    username
                })
                .select()
                .single();

        if (createError) {

            console.error(createError);

            currentProfile = {
                id: currentUser.id,
                username
            };

        } else {

            currentProfile = created;
        }

    } else {

        currentProfile = data;
    }
}


// ============================================================
// SHOW APP
// ============================================================

function showApplication() {

    authScreen.hidden = true;
    appScreen.hidden = false;

    const username =
        currentProfile?.username ||
        currentUser?.email ||
        "Пользователь";

    profileName.textContent = username;

    profileAvatar.textContent =
        getInitial(username);

    profileStatus.textContent =
        "онлайн";
}


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener("click", async () => {

    if (realtimeChannel) {

        await supabaseClient
            .removeChannel(realtimeChannel);

        realtimeChannel = null;
    }

    await supabaseClient.auth.signOut();

    currentUser = null;
    currentProfile = null;
    currentChat = null;

    appScreen.hidden = true;
    authScreen.hidden = false;

    authForm.reset();

    chatList.innerHTML = `
        <div class="empty-chats">
            <div>💬</div>
            <p>Пока нет чатов</p>
            <span>
                Найдите пользователя, чтобы начать общение
            </span>
        </div>
    `;

    messagesContainer.innerHTML = "";

    emptyChat.hidden = false;
    activeChat.hidden = true;
});


// ============================================================
// SEARCH USERS
// ============================================================

let searchTimer = null;

userSearch.addEventListener("input", () => {

    clearTimeout(searchTimer);

    const value =
        userSearch.value.trim();

    if (!value) {

        searchResults.innerHTML = "";

        return;
    }

    searchTimer = setTimeout(() => {

        searchUsers(value);

    }, 300);
});


async function searchUsers(value) {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("id, username")
            .ilike("username", `%${value}%`)
            .neq("id", currentUser.id)
            .limit(10);

    if (error) {

        console.error(error);

        searchResults.innerHTML =
            `<div style="padding:12px;color:#94a3b8">
                Ошибка поиска
            </div>`;

        return;
    }

    searchResults.innerHTML = "";

    if (!data.length) {

        searchResults.innerHTML =
            `<div style="padding:12px;color:#94a3b8">
                Пользователи не найдены
            </div>`;

        return;
    }

    data.forEach(user => {

        const button =
            document.createElement("button");

        button.className = "search-user";

        button.type = "button";

        button.innerHTML = `
            <div class="avatar">
                ${getInitial(user.username)}
            </div>

            <div class="search-user-info">
                <strong>${escapeHtml(user.username)}</strong>
                <span>Начать чат</span>
            </div>
        `;

        button.addEventListener("click", () => {

            startChatWithUser(user);

        });

        searchResults.appendChild(button);
    });
}


// ============================================================
// START CHAT
// ============================================================

async function startChatWithUser(user) {

    searchResults.innerHTML = "";
    userSearch.value = "";

    const { data: existing } =
        await supabaseClient
            .from("chat_members")
            .select("chat_id, chats(*)")
            .eq("user_id", currentUser.id);

    let chat = null;

    if (existing) {

        for (const item of existing) {

            const chatId = item.chat_id;

            const { data: members } =
                await supabaseClient
                    .from("chat_members")
                    .select("user_id")
                    .eq("chat_id", chatId);

            if (
                members &&
                members.some(member =>
                    member.user_id === user.id
                )
            ) {

                chat = item.chats;

                break;
            }
        }
    }

    if (!chat) {

        const { data: createdChat, error } =
            await supabaseClient
                .from("chats")
                .insert({})
                .select()
                .single();

        if (error) {

            console.error(error);

            showAuthError(
                "Не удалось создать чат."
            );

            return;
        }

        chat = createdChat;

        const { error: membersError } =
            await supabaseClient
                .from("chat_members")
                .insert([
                    {
                        chat_id: chat.id,
                        user_id: currentUser.id
                    },
                    {
                        chat_id: chat.id,
                        user_id: user.id
                    }
                ]);

        if (membersError) {

            console.error(membersError);

            return;
        }
    }

    await openChat(chat.id, user);
    await loadChats();
}


// ============================================================
// LOAD CHATS
// ============================================================

async function loadChats() {

    if (!currentUser) return;

    const { data, error } =
        await supabaseClient
            .from("chat_members")
            .select(`
                chat_id,
                chats (
                    id,
                    created_at
                )
            `)
            .eq("user_id", currentUser.id);

    if (error) {

        console.error(error);

        return;
    }

    chatList.innerHTML = "";

    if (!data?.length) {

        chatList.innerHTML = `
            <div class="empty-chats">
                <div>💬</div>
                <p>Пока нет чатов</p>
                <span>
                    Найдите пользователя, чтобы начать общение
                </span>
            </div>
        `;

        return;
    }

    for (const item of data) {

        const chat = item.chats;

        if (!chat) continue;

        const { data: members } =
            await supabaseClient
                .from("chat_members")
                .select("user_id")
                .eq("chat_id", chat.id);

        const otherMember =
            members?.find(
                member =>
                    member.user_id !== currentUser.id
            );

        if (!otherMember) continue;

        const { data: otherProfile } =
            await supabaseClient
                .from("profiles")
                .select("id, username")
                .eq("id", otherMember.user_id)
                .single();

        if (!otherProfile) continue;

        const chatButton =
            document.createElement("button");

        chatButton.type = "button";

        chatButton.className = "search-user";

        chatButton.innerHTML = `
            <div class="avatar">
                ${getInitial(otherProfile.username)}
            </div>

            <div class="search-user-info">
                <strong>
                    ${escapeHtml(otherProfile.username)}
                </strong>

                <span>
                    Открыть чат
                </span>
            </div>
        `;

        chatButton.addEventListener("click", () => {

            openChat(chat.id, otherProfile);

        });

        chatList.appendChild(chatButton);
    }
}


// ============================================================
// OPEN CHAT
// ============================================================

async function openChat(chatId, user) {

    currentChat = {
        id: chatId,
        user
    };

    emptyChat.hidden = true;
    activeChat.hidden = false;

    chatName.textContent =
        user.username;

    chatAvatar.textContent =
        getInitial(user.username);

    chatStatus.textContent =
        "онлайн";

    messagesContainer.innerHTML = "";

    await loadMessages();

    subscribeToMessages();

    messageInput.focus();
}


// ============================================================
// LOAD MESSAGES
// ============================================================

async function loadMessages() {

    if (!currentChat) return;

    const { data, error } =
        await supabaseClient
            .from("messages")
            .select("*")
            .eq("chat_id", currentChat.id)
            .order("created_at", {
                ascending: true
            });

    if (error) {

        console.error(error);

        messagesContainer.innerHTML =
            `<div style="padding:20px;color:#94a3b8">
                Не удалось загрузить сообщения.
            </div>`;

        return;
    }

    messagesContainer.innerHTML = "";

    data.forEach(message => {

        renderMessage(message);

    });

    scrollMessages();
}


// ============================================================
// RENDER MESSAGE
// ============================================================

function renderMessage(message) {

    const row =
        document.createElement("div");

    row.className =
        "message-row" +
        (
            message.sender_id === currentUser.id
                ? " mine"
                : ""
        );

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.innerHTML = `
        ${escapeHtml(message.content)}
        <span class="message-time">
            ${formatTime(message.created_at)}
        </span>
    `;

    row.appendChild(bubble);

    messagesContainer.appendChild(row);
}


// ============================================================
// SEND MESSAGE
// ============================================================

messageForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!currentUser || !currentChat) return;

    const content =
        messageInput.value.trim();

    if (!content) return;

    messageInput.value = "";

    const { error } =
        await supabaseClient
            .from("messages")
            .insert({
                chat_id: currentChat.id,
                sender_id: currentUser.id,
                content
            });

    if (error) {

        console.error(error);

        messageInput.value = content;

        alert(
            "Не удалось отправить сообщение."
        );
    }
});


// ============================================================
// REALTIME
// ============================================================

function subscribeToMessages() {

    if (realtimeChannel) {

        supabaseClient
            .removeChannel(realtimeChannel);
    }

    if (!currentChat) return;

    realtimeChannel =
        supabaseClient
            .channel(
                `chat-${currentChat.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter:
                        `chat_id=eq.${currentChat.id}`
                },
                payload => {

                    renderMessage(
                        payload.new
                    );

                    scrollMessages();
                }
            )
            .subscribe();
}


// ============================================================
// SCROLL
// ============================================================

function scrollMessages() {

    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// SESSION
// ============================================================

async function checkSession() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {

        console.error(error);

        return;
    }

    if (data.session) {

        await initializeUser(
            data.session.user
        );
    }
}


supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "SIGNED_IN" &&
            session
        ) {

            await initializeUser(
                session.user
            );
        }
    }
);


// ============================================================
// START
// ============================================================

checkSession();

console.log(
    "LightTech Messenger запущен"
);
