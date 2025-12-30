#!/usr/bin/env python3
"""
SQL Schema Splitter

Split our declarative schema (dump) into semantic segments for tracking
"""

import re
from pathlib import Path
from typing import List, Tuple
import rich_click as click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


class StatementCategory:
    """Defines the categories for SQL statements."""

    INIT = "01_init"
    EXTENSIONS = "02_extensions"
    FUNCTIONS = "03_functions"
    TABLES = "04_tables"
    SEQUENCES = "05_sequences"
    CONSTRAINTS = "06_constraints"
    INDEXES = "07_indexes"
    TRIGGERS = "08_triggers"
    FOREIGN_KEYS = "09_foreign_keys"
    RLS_POLICIES = "10_rls_policies"
    GRANTS = "11_grants"


def categorize_statement(statement: str) -> str:
    """
    Categorize a SQL statement based on its content.

    Args:
        statement: The SQL statement to categorize

    Returns:
        The category name for the statement
    """
    statement_stripped = statement.strip()

    # Skip empty statements
    if not statement_stripped or statement_stripped == ';':
        return None

    # Initial SET statements and COMMENT ON SCHEMA
    if (re.match(r'^SET\s+(statement_timeout|lock_timeout|idle_in_transaction|client_encoding|'
                 r'standard_conforming_strings|check_function_bodies|xmloption|'
                 r'client_min_messages|row_security)\s*=', statement_stripped) or
        re.match(r'^SELECT\s+pg_catalog\.set_config', statement_stripped) or
        re.match(r'^COMMENT\s+ON\s+SCHEMA', statement_stripped)):
        return StatementCategory.INIT

    # Extensions
    if re.match(r'^CREATE\s+EXTENSION', statement_stripped):
        return StatementCategory.EXTENSIONS

    # Functions (CREATE OR REPLACE FUNCTION and ALTER FUNCTION OWNER)
    if (re.match(r'^CREATE\s+(OR\s+REPLACE\s+)?FUNCTION', statement_stripped) or
        re.match(r'^ALTER\s+FUNCTION\s+.*\s+OWNER\s+TO', statement_stripped)):
        return StatementCategory.FUNCTIONS

    # Table-related SET statements, CREATE TABLE, ALTER TABLE OWNER, and COMMENT ON COLUMN/TABLE
    if (re.match(r'^SET\s+default_(tablespace|table_access_method)', statement_stripped) or
        re.match(r'^CREATE\s+TABLE', statement_stripped) or
        (re.match(r'^ALTER\s+TABLE\s+.*\s+OWNER\s+TO', statement_stripped)) or
        re.match(r'^COMMENT\s+ON\s+(COLUMN|TABLE)', statement_stripped)):
        return StatementCategory.TABLES

    # Sequences
    if (re.match(r'^CREATE\s+SEQUENCE', statement_stripped) or
        re.match(r'^ALTER\s+SEQUENCE', statement_stripped)):
        return StatementCategory.SEQUENCES

    # Foreign keys
    if re.match(r'^ALTER\s+TABLE\s+.*\s+ADD\s+CONSTRAINT\s+.*\s+FOREIGN\s+KEY', statement_stripped):
        return StatementCategory.FOREIGN_KEYS

    # Constraints (PRIMARY KEY, UNIQUE, CHECK, ALTER COLUMN SET DEFAULT)
    if (re.match(r'^ALTER\s+TABLE\s+.*\s+ALTER\s+COLUMN\s+.*\s+SET\s+DEFAULT', statement_stripped) or
        re.match(r'^ALTER\s+TABLE\s+.*\s+ADD\s+CONSTRAINT\s+.*\s+(PRIMARY\s+KEY|UNIQUE|CHECK)', statement_stripped)):
        return StatementCategory.CONSTRAINTS

    # Indexes
    if re.match(r'^CREATE\s+(UNIQUE\s+)?INDEX', statement_stripped):
        return StatementCategory.INDEXES

    # Triggers
    if re.match(r'^CREATE\s+(OR\s+REPLACE\s+)?TRIGGER', statement_stripped):
        return StatementCategory.TRIGGERS

    # RLS Policies
    if (re.match(r'^CREATE\s+POLICY', statement_stripped) or
        re.match(r'^ALTER\s+TABLE\s+.*\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY', statement_stripped)):
        return StatementCategory.RLS_POLICIES

    # Grants and publications
    if (re.match(r'^GRANT', statement_stripped) or
        re.match(r'^REVOKE', statement_stripped) or
        re.match(r'^ALTER\s+DEFAULT\s+PRIVILEGES', statement_stripped) or
        re.match(r'^ALTER\s+PUBLICATION\s+.*\s+OWNER\s+TO', statement_stripped)):
        return StatementCategory.GRANTS

    # Default: treat as init if it's a SET statement, otherwise put in misc
    if re.match(r'^SET\s+', statement_stripped):
        return StatementCategory.INIT

    # If we can't categorize it, put it in init as a fallback
    console.print(f"[yellow]Warning: Uncategorized statement:[/yellow] {statement_stripped[:100]}")
    return StatementCategory.INIT


def extract_statements(sql_content: str) -> List[Tuple[str, str]]:
    """
    Extract individual SQL statements from the content.

    This handles multi-line statements like functions that span many lines.

    Args:
        sql_content: The full SQL file content

    Returns:
        List of tuples (statement_text, category)
    """
    statements = []
    current_statement = []
    in_function = False
    in_dollar_quote = False
    dollar_quote_tag = None
    paren_depth = 0

    lines = sql_content.split('\n')

    for line in lines:
        # Track dollar-quoted strings (used in function bodies)
        dollar_matches = re.finditer(r'\$([^$]*)\$', line)
        for match in dollar_matches:
            tag = match.group(1)
            if not in_dollar_quote:
                in_dollar_quote = True
                dollar_quote_tag = tag
            elif tag == dollar_quote_tag:
                in_dollar_quote = False
                dollar_quote_tag = None

        # Detect function start
        if re.match(r'^\s*CREATE\s+(OR\s+REPLACE\s+)?FUNCTION', line, re.IGNORECASE):
            in_function = True

        # Track parentheses depth
        if not in_dollar_quote:
            paren_depth += line.count('(') - line.count(')')

        current_statement.append(line)

        # Determine if statement is complete
        statement_complete = False

        if in_function:
            if not in_dollar_quote and line.rstrip().endswith(';'):
                statement_complete = True
                in_function = False
        else:
            if not in_dollar_quote and line.rstrip().endswith(';') and paren_depth == 0:
                statement_complete = True

        if statement_complete:
            statement_text = '\n'.join(current_statement)
            category = categorize_statement(statement_text)
            if category:
                statements.append((statement_text, category))
            current_statement = []
            paren_depth = 0

    if current_statement:
        statement_text = '\n'.join(current_statement)
        if statement_text.strip():
            category = categorize_statement(statement_text)
            if category:
                statements.append((statement_text, category))

    return statements


@click.command()
@click.argument('input_file', type=click.Path(exists=True, path_type=Path))
@click.option(
    '--output-dir',
    '-o',
    type=click.Path(path_type=Path),
    help='Output directory for split files (default: same directory as input with _split suffix)',
)
@click.option(
    '--dry-run',
    '-n',
    is_flag=True,
    help='Show what would be done without writing files',
)
def split_schema(input_file: Path, output_dir: Path, dry_run: bool):
    """
    Split a PostgreSQL schema dump into organized files.

    Reads INPUT_FILE and splits it into multiple SQL files grouped by statement type,
    maintaining chronological order within each group.
    """
    console.print(f"[bold blue]SQL Schema Splitter[/bold blue]")
    console.print(f"Input file: {input_file}")

    if output_dir is None:
        output_dir = input_file.parent / f"{input_file.stem}_split"

    console.print(f"Output directory: {output_dir}")

    if dry_run:
        console.print("[yellow]DRY RUN MODE - No files will be written[/yellow]")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Reading schema file...", total=None)

        with open(input_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        progress.update(task, description="Parsing SQL statements...")
        statements = extract_statements(sql_content)

        progress.update(task, description=f"Found {len(statements)} statements", completed=True)

    categorized = {}
    for statement_text, category in statements:
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(statement_text)

    console.print("\n[bold]Statement distribution:[/bold]")
    for category in sorted(categorized.keys()):
        count = len(categorized[category])
        console.print(f"  {category}.sql: {count} statements")

    if dry_run:
        console.print("\n[yellow]Dry run complete. No files were written.[/yellow]")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    console.print("\n[bold]Writing files...[/bold]")
    for category in sorted(categorized.keys()):
        output_file = output_dir / f"{category}.sql"
        statements_list = categorized[category]

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"-- {category}.sql\n")
            f.write(f"-- Generated by SQL Schema Splitter\n")
            f.write(f"-- Contains {len(statements_list)} statements\n")
            f.write(f"-- Source: {input_file.name}\n\n")

            for i, statement in enumerate(statements_list):
                f.write(statement)
                if not statement.endswith('\n\n') and i < len(statements_list) - 1:
                    f.write('\n')

        console.print(f"  [green]✓[/green] {output_file.name}")

    console.print(f"\n[bold green]Done![/bold green] Split schema into {len(categorized)} files in {output_dir}")
    console.print(f"\n[dim]Original file preserved at: {input_file}[/dim]")


if __name__ == '__main__':
    split_schema()
