/**
 * Test suite for URL canonicalization
 * Run with: npx tsx scripts/test-canonicalize.ts
 */

import { canonicalizeUrl, normalizeUrl, extractDomain } from '../src/lib/canonicalize';

const TEST_URLS = [
  // Mailchimp wrapper (simulated - real ones require valid tracking IDs)
  {
    url: 'https://click.mailchimp.com/track/click/12345?u=abc&id=def&e=ghi&c=jkl&url=https%3A%2F%2Fexample.com%2Farticle',
    expectedContains: 'example.com/article',
    description: 'Mailchimp wrapper extraction',
  },

  // Substack redirect (simulated)
  {
    url: 'https://substack.com/redirect/abc123?uri=https%3A%2F%2Fwww.nytimes.com%2F2024%2F01%2Fstory.html',
    expectedContains: 'nytimes.com/2024/01/story.html',
    description: 'Substack redirect extraction',
  },

  // Real shortlink - httpbin redirect test
  {
    url: 'https://httpbin.org/redirect-to?url=https%3A%2F%2Fexample.com%2Ffinal-destination',
    expectedContains: 'example.com/final-destination',
    description: 'HTTP redirect following',
  },

  // UTM params to strip
  {
    url: 'https://example.com/article?utm_source=newsletter&utm_medium=email&ref=twitter',
    expectedContains: 'example.com/article',
    expectedNotContains: 'utm_',
    description: 'UTM parameter stripping',
  },

  // Trailing slash normalization
  {
    url: 'https://example.com/article/',
    expected: 'https://example.com/article',
    description: 'Trailing slash removal',
  },

  // Fragment removal
  {
    url: 'https://example.com/article#section-3',
    expected: 'https://example.com/article',
    description: 'Fragment removal',
  },

  // HTTP to HTTPS upgrade
  {
    url: 'http://example.com/page',
    expected: 'https://example.com/page',
    description: 'HTTP to HTTPS upgrade',
  },

  // Query param sorting
  {
    url: 'https://example.com/search?z=last&a=first&m=middle',
    expected: 'https://example.com/search?a=first&m=middle&z=last',
    description: 'Query param sorting',
  },

  // Real redirect test - GitHub short URL
  {
    url: 'https://git.io/typing-svg',
    description: 'Real redirect following (git.io)',
    isLiveTest: true,
  },

  // Beehiiv link (will test redirect following)
  {
    url: 'https://httpbin.org/redirect/3',
    description: 'Multiple redirect hops',
    expectedContains: 'httpbin.org/get',
    isLiveTest: true,
  },
];

async function runTests() {
  console.log('🧪 URL Canonicalization Test Suite\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const test of TEST_URLS) {
    console.log(`\n📝 Test: ${test.description}`);
    console.log(`   Input: ${test.url}`);

    try {
      const result = await canonicalizeUrl(test.url);

      console.log(`   Output: ${result.canonicalUrl}`);
      console.log(`   Domain: ${result.domain}`);
      console.log(`   Chain: ${result.redirectChain.length} hops`);

      if (result.error) {
        console.log(`   ⚠️  Error: ${result.error}`);
      }

      // Detailed chain logging
      if (result.redirectChain.length > 1) {
        console.log('   Redirect chain:');
        result.redirectChain.forEach((url, i) => {
          console.log(`      ${i + 1}. ${url.substring(0, 80)}${url.length > 80 ? '...' : ''}`);
        });
      }

      // Check expectations
      let testPassed = true;

      if (test.expected && result.canonicalUrl !== test.expected) {
        console.log(`   ❌ FAILED: Expected "${test.expected}"`);
        testPassed = false;
      }

      if (test.expectedContains && !result.canonicalUrl.includes(test.expectedContains)) {
        console.log(`   ❌ FAILED: Expected to contain "${test.expectedContains}"`);
        testPassed = false;
      }

      if (test.expectedNotContains && result.canonicalUrl.includes(test.expectedNotContains)) {
        console.log(`   ❌ FAILED: Should not contain "${test.expectedNotContains}"`);
        testPassed = false;
      }

      if (testPassed) {
        console.log('   ✅ PASSED');
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${TEST_URLS.length} tests\n`);

  // Additional unit tests for normalizeUrl
  console.log('\n🔧 Unit Tests: normalizeUrl()\n');

  const unitTests = [
    { input: 'https://EXAMPLE.COM/Path', expected: 'https://example.com/Path' },
    { input: 'https://example.com:443/page', expected: 'https://example.com/page' },
    { input: 'http://example.com:80/page', expected: 'https://example.com/page' },
    { input: 'https://www.example.com/', expected: 'https://www.example.com' },
  ];

  for (const test of unitTests) {
    const result = normalizeUrl(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} normalizeUrl("${test.input}")`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got:      ${result}`);
  }

  // Domain extraction tests
  console.log('\n🔧 Unit Tests: extractDomain()\n');

  const domainTests = [
    { input: 'https://www.example.com/page', expected: 'example.com' },
    { input: 'https://subdomain.example.com/page', expected: 'subdomain.example.com' },
    { input: 'https://example.com', expected: 'example.com' },
  ];

  for (const test of domainTests) {
    const result = extractDomain(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} extractDomain("${test.input}") = "${result}" (expected: "${test.expected}")`);
  }

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
  }
}

runTests().catch(console.error);
