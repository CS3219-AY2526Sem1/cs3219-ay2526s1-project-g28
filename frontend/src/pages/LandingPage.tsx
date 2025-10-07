import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import TextType from '../components/TextType';

function MacWindow({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl rounded-2xl border bg-gray-100 shadow-inner">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white rounded-t-2xl">
        <span className="h-3 w-3 rounded-full bg-red-400"></span>
        <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
        <span className="h-3 w-3 rounded-full bg-green-400"></span>
      </div>
      <div className="p-6 font-mono text-sm text-gray-800 min-h-[220px]">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="py-6 flex items-center justify-between">
          <div className="text-xl font-bold">PeerPrep</div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
            <Link className="hover:underline" to="/login">Log in</Link>
            <Link className="hover:underline" to="/signup">Sign up</Link>
          </nav>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center py-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            <h1 className="text-5xl md:text-6xl font-bold leading-tight">Your best code companion</h1>
            <p className="mt-6 text-gray-600 max-w-md">
              Pair up, practice coding interviews, and track progress with ease.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to="/login" className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-white hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300">
                Get started
              </Link>
              <Link to="/signup" className="inline-flex items-center justify-center rounded-2xl border px-6 py-3 text-gray-900 hover:bg-gray-50">
                Create an account
              </Link>
            </div>
            <ul className="mt-8 text-gray-600 space-y-2 text-sm list-disc list-inside">
              <li>Match with a peer in seconds</li>
              <li>Practice curated questions</li>
              <li>Review history and improve</li>
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="flex justify-center md:justify-end">
            <MacWindow>
              <pre className="m-0 leading-7">
    <TextType
      as="span"                          // render inline inside <pre>
      className="font-mono text-sm text-gray-800"
      text={[
    `# Python: memoized Fibonacci
from functools import lru_cache
@lru_cache
def fib(n): return n if n<2 else fib(n-1)+fib(n-2)`,

    `// JS: two-sum (indices)
const twoSum=(a,t)=>{
  const m=new Map();
  for(let i=0;i<a.length;i++){
    if(m.has(t-a[i])) return [m.get(t-a[i]),i];
    m.set(a[i],i);
  }
}`,

    `# Python: coin change (min coins)
def coin_change(coins, amt):
    dp = [0] + [float('inf')] * amt
    for c in coins:
        for a in range(c, amt + 1):
            dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amt] if dp[amt] != float('inf') else -1`,

    `// Rust: frequency map
use std::collections::HashMap;
let mut f=HashMap::new();
for x in nums { *f.entry(x).or_insert(0)+=1; }`,

    `# Python: anagram check
def is_anagram(a,b): return sorted(a)==sorted(b)`,

    `/* Java: binary search (index or -1) */
int binarySearch(int[] a, int target){
    int lo = 0, hi = a.length - 1;
    while (lo <= hi){
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}`,

    `-- SQL: running total per user
SELECT user_id, ts,
       SUM(score) OVER (
         PARTITION BY user_id
         ORDER BY ts
       ) AS running_score
FROM submissions;`,
  ]}
      textColors={['#111827']}   
      typingSpeed={10}                   // feel free to tune
      deletingSpeed={10}
      pauseDuration={600}
      loop={false}                       // only type once
      showCursor={true}
      hideCursorWhileTyping={false}
      cursorCharacter="|"
      startOnVisible={true}              // begins when scrolled into view
      variableSpeed={{ min: 35, max: 85 }} // more organic typing
    />
  </pre>
              
            </MacWindow>
          </motion.div>
        </div>

        <footer className="py-10 text-center text-xs text-gray-500">© {new Date().getFullYear()} PeerPrep</footer>
      </div>
    </div>
  );
}
