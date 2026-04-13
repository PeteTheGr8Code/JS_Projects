export function mountStart({ navigate, root }) {
    root.querySelector("#startBtn")?.addEventListener("click", () => {
        navigate("workshop");
    });
}