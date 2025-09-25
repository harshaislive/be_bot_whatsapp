const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vbsueybmbqolbmzkzbnd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic3VleWJtYnFvbGJtemt6Ym5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTEwNjUsImV4cCI6MjA2MzU4NzA2NX0.oOEWZAJMcZNuTTIblU_kyhgDK2LwfkHRLJld2JWIxAA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔧 Testing Supabase connection...')

  try {
    // Test 1: Check message_categories
    console.log('\n📊 Testing message_categories table...')
    const { data: categories, error: catError } = await supabase
      .from('message_categories')
      .select('*')
      .limit(5)

    if (catError) {
      console.error('❌ Categories error:', catError)
    } else {
      console.log('✅ Categories found:', categories?.length || 0)
      console.log('Categories:', categories?.map(c => c.display_name))
    }

    // Test 2: Check message_templates
    console.log('\n📝 Testing message_templates table...')
    const { data: templates, error: tempError } = await supabase
      .from('message_templates')
      .select('key, title, category')
      .limit(5)

    if (tempError) {
      console.error('❌ Templates error:', tempError)
      console.error('Error details:', tempError.message)
    } else {
      console.log('✅ Templates found:', templates?.length || 0)
      console.log('Templates:', templates?.map(t => `${t.key} (${t.category})`))
    }

    // Test 3: Check RLS policies
    console.log('\n🔐 Testing RLS policies...')
    const { data: rlsTest, error: rlsError } = await supabase
      .from('message_templates')
      .select('count')
      .limit(1)

    if (rlsError) {
      console.error('❌ RLS might be blocking access:', rlsError.message)
    } else {
      console.log('✅ RLS policies seem OK')
    }

  } catch (error) {
    console.error('💥 Connection failed:', error.message)
  }
}

testConnection()