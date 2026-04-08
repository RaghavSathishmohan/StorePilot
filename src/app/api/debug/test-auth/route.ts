import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST() {
  const supabase = createServiceClient()
  const results: any = {
    env: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
    },
    steps: [],
    success: false,
  }

  try {
    // Step 1: Try to list users
    results.steps.push('Step 1: Testing listUsers...')
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      results.steps.push(`❌ listUsers failed: ${listError.message}`)
      results.listUsersError = listError
    } else {
      results.steps.push(`✅ listUsers succeeded. Found ${userList.users.length} users`)
      results.userCount = userList.users.length
      results.users = userList.users.map((u: any) => ({ id: u.id, email: u.email }))
    }

    // Step 2: Check if test user already exists
    const testEmail = 'test-auth@example.com'
    const existingUser = userList?.users.find((u: any) => u.email === testEmail)

    if (existingUser) {
      results.steps.push(`ℹ️ User ${testEmail} already exists, deleting first...`)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id)
      if (deleteError) {
        results.steps.push(`⚠️ Could not delete existing user: ${deleteError.message}`)
      } else {
        results.steps.push('✅ Deleted existing test user')
      }
    }

    // Step 2b: Test database write permission
    results.steps.push('Step 1b: Testing database write...')
    try {
      const { error: writeError } = await (supabase
        .from('profiles') as any)
        .insert({ id: 'test-write-permission', email: 'test@example.com' })
        .select()

      if (writeError) {
        results.steps.push(`❌ Database write failed: ${writeError.message}`)
        results.dbWriteError = writeError.message
        // Clean up test row if it was partially created
        await (supabase.from('profiles') as any).delete().eq('id', 'test-write-permission')
      } else {
        results.steps.push('✅ Database write succeeded')
        await (supabase.from('profiles') as any).delete().eq('id', 'test-write-permission')
      }
    } catch (e: any) {
      results.steps.push(`❌ Database write exception: ${e.message}`)
    }

    // Step 3: Try to create a test user WITHOUT email_confirm
    results.steps.push('Step 2: Testing createUser (no email_confirm)...')
    const { data: data1, error: error1 } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'Test123!',
    })

    if (error1) {
      results.steps.push(`❌ createUser (no confirm) failed: ${error1.message}`)
      results.createErrorNoConfirm = {
        message: error1.message,
        name: error1.name,
        status: error1.status,
      }

      // Try with email_confirm
      results.steps.push('Step 2b: Testing createUser (with email_confirm)...')
      const { data: data2, error: error2 } = await supabase.auth.admin.createUser({
        email: testEmail + '.v2',
        password: 'Test123!',
        email_confirm: true,
      })

      if (error2) {
        results.steps.push(`❌ createUser (with confirm) failed: ${error2.message}`)
        results.createErrorWithConfirm = {
          message: error2.message,
          name: error2.name,
          status: error2.status,
        }

        // Try signUp as alternative
        results.steps.push('Step 2c: Testing signUp API...')
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail + '.v3',
          password: 'Test123!',
        })

        if (signUpError) {
          results.steps.push(`❌ signUp failed: ${signUpError.message}`)
          results.signUpError = {
            message: signUpError.message,
            name: signUpError.name,
            status: signUpError.status,
          }
        } else {
          results.steps.push(`✅ signUp succeeded! User ID: ${signUpData.user?.id}`)
          results.signUpUser = signUpData.user?.id
          // Clean up
          if (signUpData.user?.id) {
            await supabase.auth.admin.deleteUser(signUpData.user.id)
          }
        }

        return NextResponse.json(results, { status: 500 })
      }

      results.steps.push(`✅ createUser (with confirm) succeeded! User ID: ${data2.user.id}`)
      await supabase.auth.admin.deleteUser(data2.user.id)
      results.steps.push('✅ Cleaned up test user')
      results.success = true
      return NextResponse.json(results)
    }

    results.steps.push(`✅ createUser (no confirm) succeeded! User ID: ${data1.user.id}`)
    await supabase.auth.admin.deleteUser(data1.user.id)
    results.steps.push('✅ Cleaned up test user')

    results.success = true
    results.message = 'Auth is working!'

    return NextResponse.json(results)
  } catch (err) {
    results.steps.push(`❌ Exception: ${err instanceof Error ? err.message : 'Unknown'}`)
    results.error = err instanceof Error ? err.message : 'Unknown error'
    results.stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json(results, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST to test auth' })
}
