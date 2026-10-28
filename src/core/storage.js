// The only module that touches localStorage.
import { ACCOUNTS_KEY } from "../config/constants.js";

export function readAccounts() {

  try {

    return JSON.parse(
      getItem(ACCOUNTS_KEY) || "{}"
    );

  }

  catch (error) {

    return {};

  }
}


export function getItem(key) {
  return localStorage.getItem(key);
}

export function setItem(key, value) {
  localStorage.setItem(key, value);
}

export function removeItem(key) {
  localStorage.removeItem(key);
}
