# Research vault

This folder holds an attributed, local snapshot of the information from the repositories supplied for the Korea master planner. It exists for two reasons:

1. The GitHub Pages interface can be generated from a transparent, committed source instead of a hidden live scrape.
2. Maintainers can inspect the full source context behind a compact card in the app.

## What is here

| Folder | Source repository | Snapshot focus |
| --- | --- | --- |
| `sources/transport` | `sassnarep3-star/Koreatransport` | transport data and guides |
| `sources/hotels` | `karagemop466-tech/Korea-hotels` | hotel data and selection guides |
| `sources/fun` | `karagemop466-tech/KoreaFun` | events, activities, walking routes, planning notes |
| `sources/food` | `karagemop466-tech/Koreafood` | food bookmarks and city guides |
| `sources/korea` | `buffedlizard55-lab/Korea` | savings and tourist-action guides |
| `sources/emergency` | `buffedlizard55-lab/Korea-emergency` | emergency contacts, checklists, preparation, and print resources |
| `user-input` | User-supplied rough itinerary review | itinerary-format requirements and corrections applied to the two route blueprints |

Exact source branches and commits are recorded in the repository root [`README.md`](../README.md) and in [`scripts/build_catalog.py`](../scripts/build_catalog.py).

## Using the vault

The application does not attempt to render every Markdown document in the browser. It shows searchable structured records from [`data/index.json`](../data/index.json) and [`data/collections/`](../data/collections/) and offers direct links to the relevant local snapshot. This keeps the beginner interface focused while retaining the full research for review.

Do not treat the snapshot as live information. When an item matters for a real booking or safety decision, use its official provider link and check the original source repository for the most current research.
