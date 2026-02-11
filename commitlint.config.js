module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',     // New feature
                'fix',      // Bug fix
                'docs',     // Documentation only
                'style',    // Code style (formatting, etc)
                'refactor', // Code refactoring
                'perf',     // Performance improvement
                'test',     // Adding tests
                'chore',    // Maintenance
                'revert',   // Revert previous commit
                'ci',       // CI/CD changes
                'build',    // Build system changes
            ],
        ],
        'subject-case': [0], // Allow any case for subject
    },
};
