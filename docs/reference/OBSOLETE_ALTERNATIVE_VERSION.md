# Obsolete Python/Jupyter Version (231208_jupyter_viz)

This document details the features, architecture, and key components of the older Python-based version of Spideryarn Reading, found in the `obsolete_alternative_version/231208_jupyter_viz` directory. This version primarily used Jupyter notebooks for interaction and visualization.

## Features

The Python version offered several AI-assisted document analysis capabilities:

1.  **Document Parsing**: It could ingest documents from Markdown files.
2.  **Structural Analysis & Manipulation**:
    *   Represented documents as a graph of nodes (headings, paragraphs) and edges (parent-child, links).
    *   Could update and re-calculate parent-child relationships and heading levels.
    *   Utility to clean up heading structures (e.g., `delete_singleton_headings_and_promote_children`).
3.  **LLM-Powered Content Generation**:
    *   **Heading Generation**: An LLM could propose a new, more semantically structured set of headings for a document.
    *   **Summarization**: Could summarize the entire document or individual headings using an LLM.
    *   **Entity Extraction**: An LLM could identify and extract key entities (people, places, concepts, etc.) from the text, complete with aliases, ontology types (e.g., "person," "concept"), and brief/long explanations.
4.  **Table of Contents (ToC) Generation**: Could generate a ToC from the document structure, with options to filter by heading level or author (human vs. AI-generated headings).
5.  **Visualization**:
    *   Could generate network graphs (using `networkx` and `matplotlib`) to visualize the document's node-edge structure.
    *   Could output the document or parts of it as HTML, including an HTML page with extracted entities highlighted and linked.
6.  **Output/Export**:
    *   Could export the processed document to plain text, HTML, or Pandas DataFrame.

## Architecture

*   **Backend Language**: Python.
*   **Core Data Structure**: A graph-based representation using `Node` and `Edge` objects, managed by the `Collection` class.
*   **Database**: SQLite, with Peewee as the ORM. Nodes and Edges were stored in database tables.
*   **LLM Interaction**: Leveraged an external `gdutils.llms` library (not present in this specific codebase snapshot but implied by imports) for making calls to LLMs (defaulting to `gpt-4-1106-preview`). Prompts were constructed using Jinja templates.
*   **User Interface**: Primarily through Jupyter Notebooks (`viz.ipynb`, `demo.ipynb`) for running analysis steps and viewing outputs (like HTML tables or network graphs).
*   **Input Format**: Markdown files.

## Main Files

*   **`core.py`**: Handled database (SQLite via Peewee) initialization, defining `Node` and `Edge` tables.
*   **`node_edge.py`**: Defined the Peewee ORM models for `Node` (representing document elements like headings, paragraphs, summaries, tags) and `Edge` (representing relationships like parent-child, summary-of, tag-belongs-to-ontology). Nodes had attributes like text content, type, source, level, author, and a location (`loc`) for ordering. Edges defined typed relationships between nodes.
*   **`collection.py`**:
    *   Contained the central `Collection` class, which represented a document.
    *   Managed parsing of Markdown into `Node` objects.
    *   Contained methods for LLM interactions: `do_llm_generate_headings`, `do_summarise_doc`, `do_summarise_headings`, `do_llm_generate_entities`.
    *   Handled node management, structural updates (`update_parents_and_levels_for_collection`, `update_locs`), and cleanup.
    *   Provided output methods (`to_txt`, `to_html`, `to_html_table`, `to_pandas`).
    *   Included a `toc()` function for generating tables of contents.
    *   Orchestrated network graph visualization via `do_draw()`.
*   **`ai.py`**:
    *   `summarise_node()`: Sent text to an LLM for summarization and created summary `Node`s and `Edge`s.
    *   `llm_generate_headings()`: Sent HTML to an LLM to get structured heading suggestions.
*   **`ai_entities.py`**:
    *   `generate_entities()`: Sent text to an LLM to extract entities.
    *   `create_nodes_for_llm_entities()`: Created `Node`s for extracted entities (type `tag`) and linked them to ontology `Node`s.
    *   Contained logic to generate HTML with highlighted entities (`add_matched_entity_links_in_html`).
*   **`prompt_templates.py`**: Stored Jinja2 templates for the prompts used in LLM calls, specifically for `generate_entities` and `generate_headings`.
*   **`network.py`**: Likely contained functions for generating and drawing network graphs of the document structure using `networkx` and `matplotlib` (used by `Collection.do_draw()`).
*   **`viz.ipynb`, `demo.ipynb`**: Jupyter notebooks demonstrating the usage of the `Collection` class and its features for document processing, LLM interaction, and visualization. `demo.ipynb` provides a clearer workflow.
*   **`utils_markdown.py`, `utils_html.py`**: Utility functions for parsing Markdown and manipulating HTML.
*   **`requirements.txt`**: Listed Python dependencies, including `beautifulsoup4`, `html2text`, `jupyter`, `llm` (likely the `gdutils.llms` wrapper), `markdown-it-py`, `networkx`, `openai`, `pandas`, `peewee`.

## Useful Prompts

The `prompt_templates.py` file contains two key prompts:

1.  **`generate_entities`**:
    *   **Goal**: Extract an exhaustive list of important entities (people, places, concepts, etc.) from a text to create a glossary.
    *   **Instructions**: Defines what an entity is, specifies output format (JSON list of dictionaries), and required fields for each entity (`name`, `ontology`, `aliases`, `brief_explanation`, `long_explanation` (optional), `datetime` (optional), `url` (optional), `extra` (optional)).
    *   **Ontology Types**: Provides a list of allowed ontology types (person, place, date, theme, event, reference, object, organization, concept, definition, other).
    *   **Context**: Takes the input `txt` and an optional list of `already_entities` to avoid duplicates.

2.  **`generate_headings`**:
    *   **Goal**: Produce a new set of semantic headings (H1-H6) for an HTML text to create a clear, fine-grained table of contents.
    *   **Instructions**: Specifies that it should always return a new set of headings, ensure a single H1, add lower-level headings for detail, make headings clear and descriptive, handle lists appropriately, and avoid duplicates.
    *   **Output Format**: JSON list of dictionaries, where each dictionary specifies `id_of_after` (ID of the HTML element after which the new heading should be inserted) and `html` (the HTML for the new heading).
    *   **Context**: Takes the input `html`.

## Overall Workflow (deduced from `demo.ipynb`)

1.  **Initialization**: Load a Markdown file into a `Collection` object. This parses the Markdown into a graph of `Node` and `Edge` objects and stores them in the SQLite database.
2.  **(Optional) LLM Heading Generation**: Call `coll.do_llm_generate_headings()` to get AI-suggested headings. These can then be applied to the `Collection`, creating new AI-authored heading nodes.
3.  **(Optional) LLM Entity Extraction**: Call `coll.do_llm_generate_entities()` to extract key concepts and terms. This creates `tag` nodes linked to `ontology` nodes. An HTML page with these entities highlighted can be generated.
4.  **(Optional) LLM Summarization**: Call `coll.do_summarise_headings()` or `coll.do_summarise_doc()` to generate summaries.
5.  **Exploration/Output**:
    *   View the Table of Contents using `toc()`.
    *   Visualize the document graph using `coll.do_draw()`.
    *   Export to HTML table/frame using `coll.to_html_table()`.
    *   Pretty-print nodes using `pprint_nodes()`.

This version relied heavily on the graph structure for representing and manipulating document content, using LLMs for augmentation (headings, summaries, entities), and Jupyter for interactive control and visualization.
