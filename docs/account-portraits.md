# Account portraits

Staff account pictures on the phone and the website use the same open-source set.

- Library: [DiceBear](https://www.dicebear.com/) (MIT)
- Style: **Notionists** (`notionists`)
- Endpoint: `https://api.dicebear.com/9.x/notionists/png`
- Seed: the Supabase user id, so the phone and the website show the same person
- Size: request at least 256 pixels, then scale the image down into the circle
- Background: `e8eef2`
- Fallback: the first letter of the name if the image does not load

Phone: `src/components/account-avatar.tsx`  
Web: `src/components/account-portrait.tsx` in the aura-chat repo
