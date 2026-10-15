"""Generate isolated local settings without replacing an existing .env."""
import secrets
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    target = root / ".env"
    settings = (root / ".env.example").read_text(encoding="utf-8")
    settings = settings.replace("SECRET_KEY=\n", f"SECRET_KEY={secrets.token_urlsafe(48)}\n")
    settings = settings.replace("DEMO_PASSWORD=\n", f"DEMO_PASSWORD={secrets.token_urlsafe(18)}\n")
    try:
        with target.open("x", encoding="utf-8") as output:
            output.write(settings)
    except FileExistsError:
        print(".env already exists; left unchanged.")
        return
    print("Created private local .env. Demo password is its DEMO_PASSWORD value.")


if __name__ == "__main__":
    main()
