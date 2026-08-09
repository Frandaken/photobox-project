/**
 * Background = tema visual/dekorasi dasar yang digambar di BAWAH foto
 * (dan berpotensi juga overlay tipis di ATAS, kalau nanti butuh bingkai depan).
 *
 * Untuk versi awal ini, Background berupa warna solid / gradient sebagai
 * placeholder. Nanti diganti dengan gambar PNG yang diunggah admin.
 */
export const BACKGROUNDS = [
  {
    id: "bg-cream",
    name: "Krem Polos",
    thumbColor: "#F6F1E7",
    // imageUrl: "/backgrounds/bg-cream.png"  // nanti diisi setelah ada upload admin
  },
  {
    id: "bg-mint",
    name: "Mint Segar",
    thumbColor: "#D7ECE4",
  },
  {
    id: "bg-film",
    name: "Merah Film",
    thumbColor: "#F3C9BE",
  },
  {
    id: "bg-navy",
    name: "Navy Elegan",
    thumbColor: "#232A3B",
  },
];

export function getBackgroundById(id) {
  return BACKGROUNDS.find((b) => b.id === id) ?? null;
}
