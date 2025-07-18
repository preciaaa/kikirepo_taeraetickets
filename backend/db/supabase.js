const { createClient } = require('@supabase/supabase-js');

function connectToSupabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    console.log("Connection to Supabase is successful");
    return supabase;
  } catch (error) {
    console.error("Supabase connection error:", error);
    throw error;
  }
}

module.exports = connectToSupabase;
