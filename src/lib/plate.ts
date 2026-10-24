/** A licence plate as it is compared: upper-case, without spaces ("ab 123 cd" and "AB123CD" are the same plate). */
export const normalizePlate = (plate: string | null | undefined): string => (plate ?? "").replace(/\s+/g, "").toUpperCase();
