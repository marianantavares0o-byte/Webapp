import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll:()=>request.cookies.getAll(), setAll:(cookiesToSet)=>{
      cookiesToSet.forEach(({name,value,options})=>request.cookies.set(name,value));
      response = NextResponse.next({request});
      cookiesToSet.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    }}}
  );
  const {data:{user}}=await supabase.auth.getUser();
  const pathname=request.nextUrl.pathname;
  const publicPath=pathname==="/login"||pathname==="/cadastro"||pathname==="/esqueci-senha"||pathname==="/redefinir-senha"||pathname.startsWith("/auth/");
  if(!user&&!publicPath)return NextResponse.redirect(new URL("/login",request.url));
  if(user&&(pathname==="/login"||pathname==="/cadastro"))return NextResponse.redirect(new URL("/",request.url));
  return response;
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
