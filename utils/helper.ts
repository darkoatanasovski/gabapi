export const encodeFormData = (data: Record<string, string | number>) => {
  const encoded = [];
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      encoded.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`
      );
    }
  }
  return encoded.join("&");
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const random = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
};
