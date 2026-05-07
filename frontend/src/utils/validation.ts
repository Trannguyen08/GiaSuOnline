export const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

export const validatePhone = (phone: string) => {
  return String(phone).match(/(84|0[3|5|7|8|9])+([0-9]{8})\b/g);
};

export const validateRequired = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value.toString().trim() !== '';
};
