export function generateOrderCode() {

    const year = new Date().getFullYear();

    const number = Math.floor(Math.random() * 999999);

    return `RV-${year}-${number.toString().padStart(6, "0")}`;

}