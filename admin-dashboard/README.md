# Beforest Message Admin Dashboard

A modern, responsive admin dashboard for managing WhatsApp bot message templates. Built with Next.js, shadcn/ui, and Supabase.

## 🚀 Features

- **Message Template Management** - Edit all bot responses in real-time
- **Live Preview** - See exactly how messages appear in WhatsApp
- **Variable System** - Dynamic content with `{{variable}}` placeholders
- **Category Organization** - Messages organized by type with color coding
- **Usage Analytics** - Track message performance and usage
- **Professional UI** - Clean, modern interface built with shadcn/ui
- **Real-time Updates** - Changes reflect immediately in the bot

## 📋 Setup Instructions

### 1. Environment Configuration

Copy the environment file and add your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase details:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The dashboard will be available at: http://localhost:3002

### 4. Build for Production

```bash
npm run build
npm start
```

## 🎯 How to Use

### Editing Messages

1. **Browse Categories** - Use tabs to filter messages by type
2. **Select Template** - Click any message to open the editor
3. **Edit Content** - Modify title, description, and content
4. **Preview Live** - See WhatsApp preview with test variables
5. **Save Changes** - Click "Save Changes" to update the bot

### Understanding Variables

Variables use double curly braces: `{{variable_name}}`

Common variables:
- `{{name}}` - User's name
- `{{collective}}` - Selected collective name
- `{{date}}` - Dynamic dates
- `{{phone}}` - User's phone number

### Message Categories

- **Greetings** - Welcome messages
- **Main Menu** - Navigation options
- **Collective Visit** - Group visit flows
- **Experiences** - Nature activities
- **Bewild Produce** - Product information
- **Hospitality** - Accommodation booking
- **General Query** - Support and contact
- **Confirmations** - Acknowledgments
- **Errors** - Fallback messages

## 🔧 Technical Details

### Built With

- **Next.js 14** - React framework with App Router
- **shadcn/ui** - Modern UI components
- **Supabase** - Database and real-time subscriptions
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **TypeScript** - Type safety

### Database Schema

The dashboard uses these Supabase tables:
- `message_templates` - All bot messages
- `message_categories` - Organization system
- `message_usage` - Analytics data
- `admin_users` - Access control

### Security

- Row Level Security (RLS) enabled on all tables
- Authenticated access required for modifications
- Read-only access for usage analytics
- Secure environment variable handling

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

1. Build the application: `npm run build`
2. Upload `out/` folder to your hosting provider
3. Configure environment variables on your host

## 📊 Usage Analytics

The dashboard tracks:
- Message usage frequency
- Response times
- Most edited templates
- Category performance

Access analytics in the main dashboard stats cards.

## 🎨 Customization

### Theme Colors

Edit `tailwind.config.js` to customize the color scheme:

```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: "hsl(142 76% 36%)", // Beforest green
      }
    }
  }
}
```

### Adding New Categories

1. Insert into `message_categories` table
2. Add corresponding templates
3. Restart the dashboard

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use environment variables for all sensitive data
- Enable RLS policies in Supabase
- Restrict access to admin users only

## 📞 Support

For issues or questions:
- Check the console for error messages
- Verify Supabase connection
- Ensure all environment variables are set
- Contact the development team

---

Built with ❤️ for Beforest WhatsApp Bot Management