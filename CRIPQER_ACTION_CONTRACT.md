# Cripqer — Host Action Contract V1

The code contract is `src/lib/host-contracts/action-contract.ts`.

| Action         | Current host meaning                        | Persistence / owner        |
| -------------- | ------------------------------------------- | -------------------------- |
| `external_url` | Safe `http`/`https` outbound href           | None; page config owner    |
| `whatsapp`     | Normalized `https://wa.me` destination      | None; page config owner    |
| `phone`        | `tel:` destination                          | None; page config owner    |
| `email`        | `mailto:` destination                       | None; page config owner    |
| `social`       | Recognized social or safe external URL      | None; page config owner    |
| `booking`      | External booking URL only                   | Provider owns booking data |
| `form`         | Reserved; no native submission endpoint yet | Future host contract       |
| `section`      | Same-page internal section target           | None; renderer/page owner  |

## Calendar and forms

Cripqer V1 does not host calendar availability, booking submissions, form
storage, notifications, spam/rate protection, or provider credentials. A
generated page may link to an external booking/form provider through the
external URL contract. Native implementations require a separate approved
host capability and persistence design.
