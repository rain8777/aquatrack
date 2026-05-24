# AquaTrack Setup Guide
### Easy step-by-step instructions — no coding needed!

---

## What is AquaTrack?
AquaTrack is a website for water refilling station owners. It helps you manage customers, track deliveries on a map, and accept orders — all from your phone or computer.

---

## What You Need Before Starting
You need **free accounts** on these 3 websites. All are 100% free.

- **Google Account** — You probably already have one (Gmail). If not, create one at gmail.com
- **GitHub Account** — A free website for storing your files. Sign up at github.com
- **Vercel Account** — A free website for putting your site online. Sign up at vercel.com

---

## PART 1 — Set Up Your Database (Google Sheets)

Your database is just a Google Spreadsheet — like Excel, but online and free.

**Step 1.** Open your browser and go to **sheets.google.com**

**Step 2.** Click the big **+** button (New Spreadsheet)

**Step 3.** At the top, click "Untitled Spreadsheet" and rename it to: **AquaTrack Database**

**Step 4.** Look at the address bar at the top of your browser. You will see a long web address like this:
> https://docs.google.com/spreadsheets/d/**1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms**/edit

The long jumbled text in the middle (between `/d/` and `/edit`) is your **Sheet ID**. Copy it and save it in Notepad — you will need it later.

---

## PART 2 — Set Up Your Backend (Google Apps Script)

This is the "engine" that runs behind the scenes. Don't worry — you just copy and paste.

**Step 1.** While your Google Sheet is open, click the menu at the top: **Extensions → Apps Script**

A new tab will open with a code editor.

**Step 2.** You will see some text already there. **Select all of it** (press Ctrl+A on your keyboard) and **delete it**.

**Step 3.** Open the file called **Code.gs** that came with AquaTrack. Select all that text and copy it (Ctrl+A then Ctrl+C).

**Step 4.** Go back to the Apps Script tab and paste it there (Ctrl+V).

**Step 5.** Click the **Save** button (it looks like a floppy disk 💾) at the top.

---

### Add Your Secret Settings

**Step 6.** On the left side of Apps Script, click the **gear icon ⚙️** (Project Settings).

**Step 7.** Scroll down until you see **"Script Properties"**. Click **"Add Script Property"**.

You need to add **5 settings**. Add them one by one:

| Setting Name | What to Put |
|---|---|
| `GSHEET_ID` | Paste your Sheet ID from Part 1 Step 4 |
| `SECRET` | Type any secret word or phrase, like: `WaterStation2024MySecret` |
| `GAS_URL` | Leave this blank for now — you will fill it in later |
| `ADMIN_EMAIL` | Your admin email, like: `myname@gmail.com` |
| `ADMIN_PASSWORD` | A strong admin password, like: `MyAdminPass2024!` |

> **Important:** Keep your ADMIN_EMAIL and ADMIN_PASSWORD secret. This is the login you use to access the Control Panel where you approve or lock business owner accounts.

After adding all 3, click **Save Script Properties**.

---

### Publish Your Backend

**Step 8.** At the top right of Apps Script, click the blue **"Deploy"** button → then click **"New Deployment"**.

**Step 9.** A window will appear. Click the small **gear icon ⚙️** next to "Select type" and choose **"Web App"**.

**Step 10.** Fill in the settings:
- **Description:** Type anything, like `AquaTrack v1`
- **Execute as:** Choose **Me**
- **Who has access:** Choose **Anyone**

**Step 11.** Click the blue **"Deploy"** button.

**Step 12.** Google will ask you to allow permissions. Click **"Authorize access"** → choose your Google account → click **"Allow"**.

**Step 13.** A new window will show your **Web App URL**. It looks like this:
> https://script.google.com/macros/s/AKfycbw.../exec

**Copy this URL** and save it in Notepad. This is your **GAS URL**.

**Step 14.** Go back to Script Properties (gear icon → Project Settings → Script Properties) and paste your GAS URL into the `GAS_URL` field. Click **Save**.

---

## PART 3 — Upload to GitHub

GitHub is where you store your website files safely online.

**Step 1.** Go to **github.com** and sign in to your account.

**Step 2.** Click the **"+"** button at the top right → click **"New repository"**.

**Step 3.** Fill in:
- **Repository name:** `aquatrack`
- Choose **Public**
- Leave everything else as is

**Step 4.** Click **"Create repository"**.

**Step 5.** On the next page, look for the link that says **"uploading an existing file"** and click it.

**Step 6.** Unzip (extract) the **aquatrack-project.zip** file on your computer. Open the extracted folder.

**Step 7.** Drag and drop **all the files and folders** from the extracted folder into the GitHub upload area.

**Step 8.** Scroll down and click **"Commit changes"** (the green button).

Your files are now saved on GitHub! ✅

---

## PART 4 — Put Your Website Online (Vercel)

Vercel will make your website available 24/7 on the internet, for free.

**Step 1.** Go to **vercel.com** and click **"Sign Up"** → choose **"Continue with GitHub"** and connect your GitHub account.

**Step 2.** Once logged in, click **"Add New..."** → **"Project"**.

**Step 3.** You will see your `aquatrack` repository listed. Click **"Import"** next to it.

**Step 4.** On the configuration page that appears:
- Look for **"Output Directory"** and type: `public`
- Leave everything else as is

**Step 5.** Look for the section called **"Environment Variables"**. Click **"Add"** and fill in:
- **Name:** `NEXT_PUBLIC_GAS_URL`
- **Value:** Paste your GAS URL from Part 2 Step 13

**Step 6.** Click **"Deploy"** and wait about 1-2 minutes.

**Step 7.** 🎉 Your website is live! Vercel will give you a web address like:
> https://aquatrack-yourname.vercel.app

Write this address down — this is your AquaTrack website!

---

## PART 5 — First Time Using AquaTrack

**Open your website** by going to the Vercel address.

### Creating Your Owner Account:
1. Click **"Sign Up Free"** at the top
2. Click the **"Register Station"** tab
3. Fill in your name, business name, address, email, and password
4. Click **"Register My Water Station"**
5. You are now logged in as a business owner!

### Adding Your Customers:

**Option A — Owner adds the customer:**
1. Go to your dashboard and click **"Customers"** at the bottom
2. Click **"+ Add Customer"**
3. Fill in the customer's name, phone (optional), and create a username and password for them
4. Click **"Save Customer"** — they are automatically approved!
5. Give the customer their username and password so they can sign in

**Option B — Customer registers themselves:**
1. The customer goes to your website
2. They click **"Sign Up Free"** → **"Register Customer"**
3. They fill in their name, select your station, create a username and password (phone and email are optional)
4. They submit — you will see them in **"Customers"** tab under "Waiting for Approval"
5. You click **"✓ Approve"** to allow them to use the app

---

## PART 6 — Daily Use (Quick Guide)

### For You (Super Admin / Control Panel):

| What to do | Where to go |
|---|---|
| Sign in as admin | Use your ADMIN_EMAIL and ADMIN_PASSWORD on the sign-in page |
| Approve a new water station | Control Panel → Pending tab → ✅ Approve + Start Trial |
| Lock an account manually | Control Panel → All Stations → 🔒 Lock Account |
| Unlock an account | Control Panel → All Stations → 🔓 Unlock + Reset Trial |
| Add more trial days | Control Panel → Any station → +15 Days Trial |
| Delete a station | Control Panel → Any station → 🗑️ Delete |

### For Business Owners:

| What to do | Where to go |
|---|---|
| See today's sales | Dashboard tab |
| Approve new customers | Customers tab → Waiting for Approval |
| See who needs water delivery | Map tab → "Requesting Only" button |
| Chat with a customer | Map or Orders tab → Chat button |
| Mark delivery as done | Map tab → "Mark Delivered" button |
| Change your price | Settings tab → Price Per Container |
| Add a customer yourself | Customers tab → "+ Add Customer" |

### For Customers:

| What to do | Where to go |
|---|---|
| Set your home location | "My Location" tab → tap on the map |
| Order water | "Order Water" tab → choose containers → tap "Request Water Delivery" |
| Mark as urgent | Choose "🔥 Urgent!" when ordering |
| Chat with your station | Active order → "Chat with Station" button |
| See past orders | "History" tab |

---

## PART 7 — Making Changes Later

### If you change the Apps Script code:
1. Go to Apps Script
2. Click **Deploy → Manage Deployments**
3. Click the **pencil ✏️ (edit)** icon
4. Change "Version" to **"New version"**
5. Click **"Deploy"**

### If you add files to GitHub:
- Vercel will automatically update your website within 1-2 minutes every time you push to GitHub.

---

## Something Not Working?

| Problem | Solution |
|---|---|
| "Connection failed" error | Double-check your GAS URL in Vercel environment variables |
| Customers can't see your station when registering | Make sure the Apps Script is deployed with "Anyone" access |
| Map is blank or not loading | Check your internet connection. No extra setup needed for the map. |
| Can't sign in | Make sure you're using your username (not email) if you registered without email |
| Forgot your password | Ask your water station owner to remove and re-add your account |

---

*Made with ❤️ for Filipino water station owners.*
