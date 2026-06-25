const TOKEN_KEY = 'rpa_access_token';
const USER_KEY = 'rpa_user_info';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserInfo() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function setUserInfo(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUserInfo() {
  localStorage.removeItem(USER_KEY);
}

export function logout() {
  removeToken();
  removeUserInfo();
}