import hotToast from "react-hot-toast";

/** The one toast API the app uses, so the library can be swapped in one place. */
export const toast = {
  success: (message: string) => hotToast.success(message),
  error: (message: string) => hotToast.error(message, { id: message }), // same message → one toast
};
