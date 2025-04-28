# DishDecode 🍽️🔍

Decode your dish! DishDecode is an open-source web application that uses AI (powered by Google Gemini) to analyze images of food and estimate nutritional information like calories, macros, and ingredients.

<!-- Add a screenshot or GIF of the app in action here! -->
<!-- ![DishDecode Screenshot](link/to/your/screenshot.png) -->

## ✨ Features

- **Image Upload:** Securely upload food images (stored privately on AWS S3).
- **AI Analysis:** Leverages the Google Gemini vision model to identify food items and estimate nutritional content.
- **Nutrition Results:** Displays estimated calories, macronutrients (protein, carbs, fat), ingredients, portion size, and more.
- **User Authentication:** Secure sign-up and login using Supabase Auth.
- **Analysis History:** Automatically saves successful analyses to the user's account (requires Supabase DB setup).

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication & Database:** Supabase
- **Image Storage:** AWS S3
- **AI Model:** Google Gemini API (Vertex AI or AI Studio)

## 🚀 Getting Started

1.  **Prerequisites:**

    - Node.js (v18 or later recommended)
    - npm, yarn, or pnpm
    - Supabase Account & Project
    - AWS Account & S3 Bucket
    - Google Cloud Project with Gemini API enabled

2.  **Clone the repository:**

    ```bash
    git clone https://github.com/YOUR_USERNAME/DishDecode.git
    cd DishDecode
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    # or yarn install or pnpm install
    ```

4.  **Set up Environment Variables:**
    Create a `.env.local` file in the root directory by copying `.env.example` (if provided) or creating it manually. Fill in the following variables:

    ```.env.local
    # Supabase (find these in your Supabase project settings)
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # AWS (create an IAM user with S3 permissions)
    AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
    AWS_REGION=YOUR_AWS_S3_BUCKET_REGION # e.g., us-east-1
    AWS_S3_BUCKET_NAME=YOUR_S3_BUCKET_NAME

    # Google Gemini (find this in your Google Cloud Console)
    GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
    ```

5.  **Supabase Setup:**

    - Enable Authentication in your Supabase project. Configure providers if needed.
    - Set up the required database tables (e.g., `food_analyses`, `user_profiles`) if you intend to save analysis history. You might need to run SQL migrations (check for a `supabase/migrations` folder).

6.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 💡 Usage

1.  Sign up or log in to your account.
2.  Upload a clear image of your food item using the uploader.
3.  Click the "Analyze Food" button.
4.  Wait for the AI analysis to complete.
5.  View the detailed nutritional results!

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue to report bugs or suggest features, or submit a pull request with improvements.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information.
