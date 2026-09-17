// ============================================
// LIGHTTECH MESSENGER
// Supabase configuration
// ============================================

const SUPABASE_URL = "https://vkfxpaxcqbazfrqeresn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_lHpYp453zZbNrMP8KE6j-w_oIUTU_n7";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ============================================
// DOM ELEMENTS
// ============================================

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const authCard = document.getElementById("auth-card");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

const authForm = document.getElementById("auth-form");
const usernameField = document.getElementById("username-field");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authSubmit = document.getElementById("auth-submit");
const authError = document.getElementById("auth-error");
const authSuccess = document.getElementById("auth-success");
const toggleAuth = document.getElementById("toggle-auth");

const logoutButton = document.getElementById("logout-button");

const profileAvatar = document.getElementById("profile-avatar");
const profileName = document.getElementById("profile-name");
const profileStatus = document.getElementById("profile-status");

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
const sendButton = document.getElementById("send-button");


// ============================================
// STATE
// ============================================

let currentUser = null;
let currentProfile = null;
let currentChat = null;
let realtimeChannel = null;

let isLoginMode = true;


// ============================================
// HELPERS
// ============================================

function showAuthError(message) {
  if (!authError) return;

  authError.textContent = message;
  authError.hidden = false;

  if (authSuccess) {
    authSuccess.hidden = true;
  }
}


function showAuthSuccess(message) {
  if (!authSuccess) return;

  authSuccess.textContent = message;
  authSuccess.hidden = false;

  if (authError) {
    authError.hidden = true;
  }
}


function clearAuthMessages() {
  if (authError) {
    authError.hidden = true;
    authError.textContent = "";
  }

  if (authSuccess) {
    authSuccess.hidden = true;
    authSuccess.textContent = "";
  }
}


function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


function getInitials(name) {
  if (!name) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("");
}


function translateError(error) {
  if (!error) {
    return "Произошла неизвестная ошибка.";
  }

  const message = error.message || String(error);

  if (message.includes("Invalid login credentials")) {
    return "Неверный email или пароль.";
  }

  if (message.includes("User already registered")) {
    return "Пользователь с таким email уже зарегистрирован.";
  }

  if (message.includes("Password should be at least")) {
    return "Пароль слишком короткий.";
  }

  if (message.includes("rate limit")) {
    return "Слишком много попыток. Попробуйте немного позже.";
  }

  if (message.includes("duplicate key")) {
    return "Такое имя пользователя уже занято.";
  }

  return message;
}


// ============================================
// AUTH MODE TOGGLE
// ============================================

if (toggleAuth) {
  toggleAuth.addEventListener("click", event => {
    event.preventDefault();

    isLoginMode = !isLoginMode;

    clearAuthMessages();

    if (isLoginMode) {
      if (authTitle) {
        authTitle.textContent = "С возвращением";
      }

      if (authSubtitle) {
        authSubtitle.textContent = "Войдите в свой аккаунт LightTech";
      }

      if (usernameField) {
        usernameField.hidden = true;
      }

      if (authSubmit) {
        authSubmit.textContent = "Войти";
      }

      toggleAuth.textContent = "Нет аккаунта? Зарегистрироваться";

    } else {
      if (authTitle) {
        authTitle.textContent = "Создать аккаунт";
      }

      if (authSubtitle) {
        authSubtitle.textContent = "Присоединяйтесь к LightTech";
      }

      if (usernameField) {
        usernameField.hidden = false;
      }

      if (authSubmit) {
        authSubmit.textContent = "Зарегистрироваться";
      }

      toggleAuth.textContent = "Уже есть аккаунт? Войти";
    }
  });
}


// ============================================
// LOGIN / REGISTRATION
// ============================================

if (authForm) {
  authForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearAuthMessages();

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
      showAuthError("Введите email и пароль.");
      return;
    }

    if (!isLoginMode) {
      const username = usernameInput?.value.trim();

      if (!username) {
        showAuthError("Введите имя пользователя.");
        return;
      }

      if (username.length < 3) {
        showAuthError("Имя пользователя должно содержать минимум 3 символа.");
        return;
      }

      await register(username, email, password);

    } else {
      await login(email, password);
    }
  });
}


async function register(username, email, password) {
  if (authSubmit) {
    authSubmit.disabled = true;
    authSubmit.textContent = "Регистрация...";
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signUp({
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

    if (!data.user) {
      throw new Error("Не удалось создать пользователя.");
    }

    currentUser = data.user;

    // Если подтверждение email выключено,
    // сразу создаём профиль и открываем приложение.
    if (data.session) {

      await createProfile(
        data.user.id,
        username
      );

      await showApplication();

      return;
    }

    // Если Supabase требует подтверждение email.
    showAuthSuccess(
      "Аккаунт создан. Проверьте почту и подтвердите email."
    );

  } catch (error) {
    console.error("Registration error:", error);
    showAuthError(translateError(error));

  } finally {
    if (authSubmit) {
      authSubmit.disabled = false;
      authSubmit.textContent = isLoginMode
        ? "Войти"
        : "Зарегистрироваться";
    }
  }
}


async function login(email, password) {
  if (authSubmit) {
    authSubmit.disabled = true;
    authSubmit.textContent = "Вход...";
  }

  try {
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    await initializeUser();

    await showApplication();

  } catch (error) {
    console.error("Login error:", error);
    showAuthError(translateError(error));

  } finally {
    if (authSubmit) {
      authSubmit.disabled = false;
      authSubmit.textContent = isLoginMode
        ? "Войти"
        : "Зарегистрироваться";
    }
  }
}


// ============================================
// PROFILE
// ============================================

async function createProfile(userId, username) {

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      username
    })
    .select()
    .single();

  if (error) {

    // Если профиль уже существует — просто загрузим его.
    if (error.code === "23505") {
      return loadProfile(userId);
    }

    throw error;
  }

  currentProfile = data;

  return data;
}


async function loadProfile(userId) {

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {

    const username =
      currentUser?.user_metadata?.username ||
      currentUser?.email?.split("@")[0] ||
      `user_${userId.slice(0, 8)}`;

    return createProfile(
      userId,
      username
    );
  }

  currentProfile = data;

  return data;
}


async function initializeUser() {

  if (!currentUser) {
    return;
  }

  await loadProfile(currentUser.id);
}


// ============================================
// SHOW APP
// ============================================

async function showApplication() {

  if (authScreen) {
    authScreen.hidden = true;
  }

  if (appScreen) {
    appScreen.hidden = false;
  }

  if (currentProfile) {

    if (profileName) {
      profileName.textContent =
        "@" + currentProfile.username;
    }

    if (profileAvatar) {
      profileAvatar.textContent =
        getInitials(currentProfile.username);
    }

    if (profileStatus) {
      profileStatus.textContent = "В сети";
    }
  }

  await loadChatList();
}


// ============================================
// LOGOUT
// ============================================

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {

    try {

      if (realtimeChannel) {
        await supabase.removeChannel(
          realtimeChannel
        );

        realtimeChannel = null;
      }

      await supabase.auth.signOut();

      currentUser = null;
      currentProfile = null;
      currentChat = null;

      if (appScreen) {
        appScreen.hidden = true;
      }

      if (authScreen) {
        authScreen.hidden = false;
      }

      if (authForm) {
        authForm.reset();
      }

    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}


// ============================================
// SEARCH USERS
// ============================================

let searchTimeout = null;

if (userSearch) {

  userSearch.addEventListener("input", () => {

    clearTimeout(searchTimeout);

    const query = userSearch.value.trim();

    if (!query) {

      if (searchResults) {
        searchResults.innerHTML = "";
      }

      return;
    }

    searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  });
}


async function searchUsers(query) {

  if (!searchResults) {
    return;
  }

  searchResults.innerHTML =
    `<div class="search-loading">Поиск...</div>`;

  try {

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${query}%`)
      .neq("id", currentUser.id)
      .limit(20);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      searchResults.innerHTML =
        `<div class="search-empty">Пользователи не найдены</div>`;

      return;
    }

    searchResults.innerHTML = "";

    data.forEach(user => {

      const element =
        document.createElement("button");

      element.className = "search-user";

      element.type = "button";

      element.innerHTML = `
        <div class="user-avatar">
          ${escapeHTML(getInitials(user.username))}
        </div>

        <div class="user-info">
          <strong>@${escapeHTML(user.username)}</strong>
          <span>Начать чат</span>
        </div>
      `;

      element.addEventListener("click", () => {
        startChatWithUser(user);
      });

      searchResults.appendChild(element);
    });

  } catch (error) {

    console.error("Search error:", error);

    searchResults.innerHTML =
      `<div class="search-empty">${escapeHTML(
        translateError(error)
      )}</div>`;
  }
}


// ============================================
// START CHAT
// ============================================

async function startChatWithUser(user) {

  if (!currentUser) {
    return;
  }

  try {

    // Ищем существующие чаты текущего пользователя.
    const {
      data: myMemberships,
      error: membershipsError
    } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", currentUser.id);

    if (membershipsError) {
      throw membershipsError;
    }

    let existingChatId = null;

    if (myMemberships?.length) {

      for (const membership of myMemberships) {

        const {
          data: otherMembership,
          error: otherError
        } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", membership.chat_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (otherError) {
          continue;
        }

        if (otherMembership) {
          existingChatId = membership.chat_id;
          break;
        }
      }
    }


    // Если чат уже существует — открываем его.
    if (existingChatId) {

      await openChat(
        existingChatId,
        user
      );

      return;
    }


    // Создаём новый чат.
    const {
      data: newChat,
      error: chatError
    } = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();

    if (chatError) {
      throw chatError;
    }


    // Добавляем текущего пользователя.
    const {
      error: firstMemberError
    } = await supabase
      .from("chat_members")
      .insert({
        chat_id: newChat.id,
        user_id: currentUser.id
      });

    if (firstMemberError) {
      throw firstMemberError;
    }


    // Добавляем второго пользователя.
    const {
      error: secondMemberError
    } = await supabase
      .from("chat_members")
      .insert({
        chat_id: newChat.id,
        user_id: user.id
      });

    if (secondMemberError) {
      throw secondMemberError;
    }


    await loadChatList();

    await openChat(
      newChat.id,
      user
    );

  } catch (error) {

    console.error("Start chat error:", error);

    alert(
      "Не удалось создать чат:\n" +
      translateError(error)
    );
  }
}


// ============================================
// CHAT LIST
// ============================================

async function loadChatList() {

  if (!currentUser || !chatList) {
    return;
  }

  try {

    const {
      data: memberships,
      error
    } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", currentUser.id);

    if (error) {
      throw error;
    }

    chatList.innerHTML = "";

    if (!memberships || memberships.length === 0) {

      if (emptyChat) {
        emptyChat.hidden = false;
      }

      return;
    }

    if (emptyChat) {
      emptyChat.hidden = true;
    }


    for (const membership of memberships) {

      const {
        data: members
      } = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", membership.chat_id);


      const otherMember =
        members?.find(
          member =>
            member.user_id !== currentUser.id
        );


      if (!otherMember) {
        continue;
      }


      const {
        data: otherProfile
      } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", otherMember.user_id)
        .maybeSingle();


      if (!otherProfile) {
        continue;
      }


      const chatElement =
        document.createElement("button");

      chatElement.type = "button";
      chatElement.className = "chat-item";

      chatElement.innerHTML = `
        <div class="chat-item-avatar">
          ${escapeHTML(getInitials(otherProfile.username))}
        </div>

        <div class="chat-item-info">
          <strong>@${escapeHTML(otherProfile.username)}</strong>
          <span>Открыть чат</span>
        </div>
      `;

      chatElement.addEventListener(
        "click",
        () => {
          openChat(
            membership.chat_id,
            otherProfile
          );
        }
      );

      chatList.appendChild(chatElement);
    }

  } catch (error) {

    console.error(
      "Load chat list error:",
      error
    );
  }
}


// ============================================
// OPEN CHAT
// ============================================

async function openChat(
  chatId,
  otherUser
) {

  currentChat = {
    id: chatId,
    user: otherUser
  };


  if (emptyChat) {
    emptyChat.hidden = true;
  }

  if (activeChat) {
    activeChat.hidden = false;
  }


  if (chatName) {
    chatName.textContent =
      "@" + otherUser.username;
  }

  if (chatAvatar) {
    chatAvatar.textContent =
      getInitials(otherUser.username);
  }

  if (chatStatus) {
    chatStatus.textContent = "В сети";
  }


  await loadMessages(chatId);

  subscribeToMessages(chatId);

  if (messageInput) {
    messageInput.focus();
  }
}


// ============================================
// LOAD MESSAGES
// ============================================

async function loadMessages(chatId) {

  if (!messagesContainer) {
    return;
  }

  messagesContainer.innerHTML =
    `<div class="messages-loading">Загрузка сообщений...</div>`;


  try {

    const {
      data,
      error
    } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true
      });


    if (error) {
      throw error;
    }


    messagesContainer.innerHTML = "";


    if (!data || data.length === 0) {

      messagesContainer.innerHTML =
        `<div class="messages-empty">
          Нет сообщений. Напишите первым!
        </div>`;

      return;
    }


    data.forEach(message => {
      renderMessage(message);
    });


    scrollMessagesToBottom();

  } catch (error) {

    console.error(
      "Load messages error:",
      error
    );

    messagesContainer.innerHTML =
      `<div class="messages-empty">
        Не удалось загрузить сообщения.
      </div>`;
  }
}


// ============================================
// RENDER MESSAGE
// ============================================

function renderMessage(message) {

  if (!messagesContainer) {
    return;
  }


  // Не добавляем одно сообщение повторно.
  if (
    messagesContainer.querySelector(
      `[data-message-id="${message.id}"]`
    )
  ) {
    return;
  }


  const isOwn =
    message.sender_id === currentUser.id;


  const messageElement =
    document.createElement("div");

  messageElement.className =
    isOwn
      ? "message own"
      : "message";

  messageElement.dataset.messageId =
    message.id;


  const time = new Date(
    message.created_at
  ).toLocaleTimeString(
    "ru-RU",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );


  messageElement.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">
        ${escapeHTML(message.content)}
      </div>

      <div class="message-time">
        ${time}
      </div>
    </div>
  `;


  // Убираем placeholder.
  const empty =
    messagesContainer.querySelector(
      ".messages-empty"
    );

  if (empty) {
    empty.remove();
  }


  messagesContainer.appendChild(
    messageElement
  );

  scrollMessagesToBottom();
}


// ============================================
// SEND MESSAGE
// ============================================

if (messageForm) {

  messageForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await sendMessage();
    }
  );
}


async function sendMessage() {

  if (
    !currentUser ||
    !currentChat ||
    !messageInput
  ) {
    return;
  }


  const content =
    messageInput.value.trim();


  if (!content) {
    return;
  }


  if (sendButton) {
    sendButton.disabled = true;
  }


  try {

    const {
      error
    } = await supabase
      .from("messages")
      .insert({
        chat_id: currentChat.id,
        sender_id: currentUser.id,
        content
      });


    if (error) {
      throw error;
    }


    messageInput.value = "";

  } catch (error) {

    console.error(
      "Send message error:",
      error
    );

    alert(
      "Не удалось отправить сообщение:\n" +
      translateError(error)
    );

  } finally {

    if (sendButton) {
      sendButton.disabled = false;
    }

    if (messageInput) {
      messageInput.focus();
    }
  }
}


// ============================================
// REALTIME
// ============================================

function subscribeToMessages(chatId) {

  // Удаляем старую подписку.
  if (realtimeChannel) {

    supabase.removeChannel(
      realtimeChannel
    );

    realtimeChannel = null;
  }


  realtimeChannel =
    supabase
      .channel(
        `messages-${chatId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`
        },
        payload => {

          if (
            payload.new &&
            payload.new.chat_id === chatId
          ) {
            renderMessage(
              payload.new
            );
          }
        }
      )
      .subscribe();
}


// ============================================
// SCROLL
// ============================================

function scrollMessagesToBottom() {

  if (!messagesContainer) {
    return;
  }

  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


// ============================================
// SESSION RESTORE
// ============================================

async function restoreSession() {

  try {

    const {
      data,
      error
    } = await supabase.auth.getSession();


    if (error) {
      throw error;
    }


    if (data.session?.user) {

      currentUser =
        data.session.user;

      await initializeUser();

      await showApplication();

    } else {

      if (authScreen) {
        authScreen.hidden = false;
      }

      if (appScreen) {
        appScreen.hidden = true;
      }
    }

  } catch (error) {

    console.error(
      "Session restore error:",
      error
    );

    if (authScreen) {
      authScreen.hidden = false;
    }

    if (appScreen) {
      appScreen.hidden = true;
    }
  }
}


// ============================================
// AUTH STATE CHANGES
// ============================================

supabase.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );


    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {

      currentUser =
        session.user;

    }


    if (
      event === "SIGNED_OUT"
    ) {

      currentUser = null;
      currentProfile = null;
      currentChat = null;
    }
  }
);


// ============================================
// START
// ============================================

restoreSession();
