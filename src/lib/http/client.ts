import axios, { type AxiosError } from "axios";

export const http = axios.create({ baseURL: "/api/v1" }); // same origin → cookies sent automatically

/**
 * Better Auth uses one sliding session cookie, so there is no refresh call (features-spec §2.3).
 * A 401 means the session is gone: send the user to sign in and bring them back afterwards.
 */
http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
      const redirectTo = encodeURIComponent(location.pathname + location.search);
      // A full navigation on purpose: this runs outside React, and the session is gone.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?redirectTo=${redirectTo}`);
    }
    return Promise.reject(error);
  },
);
